import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { google, drive_v3 } from 'googleapis';
import { Readable } from 'stream';

interface EstructuraCarpetasParams {
    periodo: string;
    numeroCorte: number;
}

interface UploadPdfParams {
    parentFolderId: string;
    fileName: string;
    mimeType: string;
    buffer: Buffer;
}

@Injectable()
export class GoogleDriveService {
    private readonly logger = new Logger(GoogleDriveService.name);
    private driveClient: drive_v3.Drive | null = null;
    private carpetaPadreValidada: {
        id: string;
        nombre: string;
        driveId: string | null;
        tipoAlmacenamiento: 'SHARED_DRIVE' | 'MY_DRIVE';
    } | null = null;

    constructor(private readonly configService: ConfigService) { }

    private getPrivateKey(): string {
        const raw = String(this.configService.get<string>('GOOGLE_DRIVE_PRIVATE_KEY') || '').trim();
        if (!raw) return '';

        const sinComillas = raw
            .replace(/^"|"$/g, '')
            .replace(/^'|'$/g, '');

        return sinComillas
            .replace(/\\r/g, '')
            .replace(/\\n/g, '\n')
            .replace(/\r/g, '')
            .trim();
    }

    private getDriveClient(): drive_v3.Drive {
        if (this.driveClient) return this.driveClient;

        const clientEmail = String(this.configService.get<string>('GOOGLE_DRIVE_CLIENT_EMAIL') || '').trim();
        const privateKey = this.getPrivateKey();

        this.logger.log(`[DriveAuth] Inicializando cliente Drive con cuenta: ${clientEmail || '(vacia)'}`);

        if (!clientEmail || !privateKey) {
            throw new ServiceUnavailableException('Integracion con Drive no configurada en el backend');
        }

        const auth = new google.auth.JWT({
            email: clientEmail,
            key: privateKey,
            scopes: ['https://www.googleapis.com/auth/drive'],
        });

        this.driveClient = google.drive({ version: 'v3', auth });
        return this.driveClient;
    }

    private getParentFolderIdConfig(): string {
        const parentFolderId = String(this.configService.get<string>('GOOGLE_DRIVE_PARENT_FOLDER_ID') || '').trim();
        this.logger.log(`[DriveConfig] GOOGLE_DRIVE_PARENT_FOLDER_ID leído: ${parentFolderId || '(vacio)'}`);

        if (!parentFolderId) {
            throw new ServiceUnavailableException(
                'Falta configurar GOOGLE_DRIVE_PARENT_FOLDER_ID con una carpeta de Google Drive.',
            );
        }

        return parentFolderId;
    }

    private extraerMensajeDriveError(error: any): string {
        const reason = String(error?.errors?.[0]?.reason || error?.response?.data?.error?.errors?.[0]?.reason || '').trim();
        const message = String(error?.message || error?.response?.data?.error?.message || '').trim();
        const lower = `${reason} ${message}`.toLowerCase();

        if (lower.includes('notfound') || lower.includes('file not found')) {
            return 'No se pudo acceder a la carpeta configurada de Google Drive. Verifique el ID de carpeta y los permisos de la cuenta uniputumayoagendas@gmail.com.';
        }

        if (
            lower.includes('insufficient')
            || lower.includes('forbidden')
            || lower.includes('permission')
        ) {
            return 'No se pudo acceder a la carpeta configurada de Google Drive. Verifique el ID de carpeta y los permisos de la cuenta uniputumayoagendas@gmail.com.';
        }

        if (lower.includes('storagequotaexceeded') || lower.includes('service accounts do not have storage quota')) {
            return 'No se pudo acceder a la carpeta configurada de Google Drive. Verifique el ID de carpeta y los permisos de la cuenta uniputumayoagendas@gmail.com.';
        }

        return 'No fue posible completar la operacion con Google Drive';
    }

    private async validarCarpetaPadreConfigurada(): Promise<{
        id: string;
        nombre: string;
        driveId: string | null;
        tipoAlmacenamiento: 'SHARED_DRIVE' | 'MY_DRIVE';
    }> {
        if (this.carpetaPadreValidada) {
            this.logger.log(
                `[DriveParent] Usando cache carpeta padre id=${this.carpetaPadreValidada.id} nombre=${this.carpetaPadreValidada.nombre} tipo=${this.carpetaPadreValidada.tipoAlmacenamiento}`,
            );
            return this.carpetaPadreValidada;
        }

        const drive = this.getDriveClient();
        const parentFolderId = this.getParentFolderIdConfig();
        this.logger.log(`[DriveParent] Validando carpeta padre id=${parentFolderId}`);

        try {
            const { data } = await drive.files.get({
                fileId: parentFolderId,
                fields: 'id,name,mimeType,driveId,trashed',
                supportsAllDrives: true,
            });

            if (!data?.id) {
                throw new ServiceUnavailableException(
                    'No se pudo obtener la carpeta configurada en GOOGLE_DRIVE_PARENT_FOLDER_ID.',
                );
            }

            if (data.mimeType !== 'application/vnd.google-apps.folder') {
                throw new ServiceUnavailableException(
                    'GOOGLE_DRIVE_PARENT_FOLDER_ID debe apuntar a una carpeta de Google Drive.',
                );
            }

            if (data.trashed) {
                throw new ServiceUnavailableException(
                    'La carpeta configurada en GOOGLE_DRIVE_PARENT_FOLDER_ID esta en la papelera.',
                );
            }

            this.carpetaPadreValidada = {
                id: data.id,
                nombre: String(data.name || 'carpeta'),
                driveId: data.driveId || null,
                tipoAlmacenamiento: data.driveId ? 'SHARED_DRIVE' : 'MY_DRIVE',
            };
            this.logger.log(
                `[DriveParent] Carpeta válida id=${this.carpetaPadreValidada.id} nombre=${this.carpetaPadreValidada.nombre} tipo=${this.carpetaPadreValidada.tipoAlmacenamiento}`,
            );
            return this.carpetaPadreValidada;
        } catch (error: any) {
            this.logger.error(
                `[DriveParent] Error validando carpeta padre id=${parentFolderId}: ${String(error?.message || error)}`,
                error?.stack,
            );
            if (error instanceof ServiceUnavailableException) {
                throw error;
            }

            throw new ServiceUnavailableException(this.extraerMensajeDriveError(error));
        }
    }

    private escapeQueryValue(value: string): string {
        return value.replace(/'/g, "\\'");
    }

    private async buscarCarpetaPorNombre(nombre: string, parentId: string): Promise<string | null> {
        const drive = this.getDriveClient();
        const q = [
            `name = '${this.escapeQueryValue(nombre)}'`,
            `mimeType = 'application/vnd.google-apps.folder'`,
            `trashed = false`,
            `'${parentId}' in parents`,
        ].join(' and ');

        try {
            const { data } = await drive.files.list({
                q,
                fields: 'files(id,name)',
                pageSize: 1,
                includeItemsFromAllDrives: true,
                supportsAllDrives: true,
            });
            const carpeta = data.files?.[0];
            if (carpeta?.id) {
                this.logger.log(`[DriveFolder] Carpeta existente encontrada nombre=${nombre} id=${carpeta.id} parent=${parentId}`);
                return carpeta.id;
            }
            this.logger.log(`[DriveFolder] Carpeta no existe aún nombre=${nombre} parent=${parentId}`);
            return null;
        } catch (error: any) {
            this.logger.error(
                `[DriveFolder] Error buscando carpeta nombre=${nombre} parent=${parentId}: ${String(error?.message || error)}`,
                error?.stack,
            );
            throw new ServiceUnavailableException(this.extraerMensajeDriveError(error));
        }
    }

    private async crearCarpeta(nombre: string, parentId: string): Promise<string> {
        const drive = this.getDriveClient();
        let data: drive_v3.Schema$File;
        try {
            const respuesta = await drive.files.create({
                requestBody: {
                    name: nombre,
                    mimeType: 'application/vnd.google-apps.folder',
                    parents: [parentId],
                },
                fields: 'id',
                supportsAllDrives: true,
            });
            data = respuesta.data;
        } catch (error: any) {
            this.logger.error(
                `[DriveFolder] Error creando carpeta nombre=${nombre} parent=${parentId}: ${String(error?.message || error)}`,
                error?.stack,
            );
            throw new ServiceUnavailableException(this.extraerMensajeDriveError(error));
        }

        if (!data.id) {
            throw new ServiceUnavailableException('No fue posible crear una carpeta en Drive');
        }

        this.logger.log(`[DriveFolder] Carpeta creada nombre=${nombre} id=${data.id} parent=${parentId}`);
        return data.id;
    }

    private async asegurarCarpeta(nombre: string, parentId: string): Promise<string> {
        const carpetaExistente = await this.buscarCarpetaPorNombre(nombre, parentId);
        if (carpetaExistente) return carpetaExistente;
        return this.crearCarpeta(nombre, parentId);
    }

    async asegurarEstructuraEvidencias(params: EstructuraCarpetasParams): Promise<string> {
        const carpetaPadre = await this.validarCarpetaPadreConfigurada();
        const carpetaPeriodo = await this.asegurarCarpeta(params.periodo, carpetaPadre.id);
        const carpetaSeguimiento = await this.asegurarCarpeta('seguimiento_semanal', carpetaPeriodo);
        const carpetaCorte = await this.asegurarCarpeta(`corte_${params.numeroCorte}`, carpetaSeguimiento);

        this.logger.log(
            `[DrivePath] Ruta final periodo=${params.periodo} corte=${params.numeroCorte} => ${carpetaPadre.nombre}/${params.periodo}/seguimiento_semanal/corte_${params.numeroCorte} (folderId=${carpetaCorte})`,
        );

        return carpetaCorte;
    }

    async existeArchivoConNombre(parentFolderId: string, fileName: string): Promise<boolean> {
        const drive = this.getDriveClient();
        const q = [
            `name = '${this.escapeQueryValue(fileName)}'`,
            `trashed = false`,
            `'${parentFolderId}' in parents`,
        ].join(' and ');

        try {
            const { data } = await drive.files.list({
                q,
                fields: 'files(id)',
                pageSize: 1,
                includeItemsFromAllDrives: true,
                supportsAllDrives: true,
            });
            return Boolean(data.files?.[0]?.id);
        } catch (error: any) {
            this.logger.error(
                `[DriveFile] Error consultando existencia archivo nombre=${fileName} parent=${parentFolderId}: ${String(error?.message || error)}`,
                error?.stack,
            );
            throw new ServiceUnavailableException(this.extraerMensajeDriveError(error));
        }
    }

    async subirPdf(params: UploadPdfParams): Promise<{ fileId: string; webViewLink: string }> {
        const drive = this.getDriveClient();
        let data: drive_v3.Schema$File;
        this.logger.log(`[DriveUpload] Iniciando subida nombre=${params.fileName} parent=${params.parentFolderId}`);
        try {
            const respuesta = await drive.files.create({
                requestBody: {
                    name: params.fileName,
                    parents: [params.parentFolderId],
                    mimeType: params.mimeType,
                },
                media: {
                    mimeType: params.mimeType,
                    body: Readable.from(params.buffer),
                },
                fields: 'id, webViewLink',
                supportsAllDrives: true,
            });
            data = respuesta.data;
        } catch (error: any) {
            this.logger.error(
                `[DriveUpload] Error subiendo nombre=${params.fileName} parent=${params.parentFolderId}: ${String(error?.message || error)}`,
                error?.stack,
            );
            throw new ServiceUnavailableException(this.extraerMensajeDriveError(error));
        }

        if (!data.id) {
            throw new ServiceUnavailableException('No fue posible guardar el archivo en Drive');
        }

        const resultado = {
            fileId: data.id,
            webViewLink: data.webViewLink || `https://drive.google.com/file/d/${data.id}/view`,
        };
        this.logger.log(`[DriveUpload] Respuesta API fileId=${resultado.fileId} webViewLink=${resultado.webViewLink}`);
        return resultado;
    }

    async eliminarArchivo(fileId: string): Promise<void> {
        if (!fileId) return;

        const drive = this.getDriveClient();
        try {
            await drive.files.delete({
                fileId,
                supportsAllDrives: true,
            });
            this.logger.log(`[DriveDelete] Archivo eliminado fileId=${fileId}`);
        } catch (error: any) {
            const reason = String(error?.errors?.[0]?.reason || error?.response?.data?.error?.errors?.[0]?.reason || '').toLowerCase();
            const message = String(error?.message || error?.response?.data?.error?.message || '').toLowerCase();

            if (reason.includes('notfound') || message.includes('file not found')) {
                this.logger.warn(`[DriveDelete] Archivo no encontrado, se continúa fileId=${fileId}`);
                return;
            }

            this.logger.error(
                `[DriveDelete] Error eliminando archivo fileId=${fileId}: ${String(error?.message || error)}`,
                error?.stack,
            );
            throw new ServiceUnavailableException('No se pudo eliminar el archivo en Google Drive');
        }
    }
}
