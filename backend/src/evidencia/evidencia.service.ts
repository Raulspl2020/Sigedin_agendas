import {
    BadRequestException,
    ForbiddenException,
    HttpException,
    Injectable,
    Logger,
    NotFoundException,
    ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { access, mkdir, unlink, writeFile } from 'fs/promises';
import { constants as fsConstants } from 'fs';
import { join } from 'path';
import { Evidencia } from './entities/evidencia.entity';
import { SeguimientoSemanal } from '../seguimiento/entities/seguimiento.entity';
import { ScopeService, UserScope } from '../auth/scope.service';
import { GoogleDriveService } from './services/google-drive.service';

interface ContextoSeguimientoEvidencia {
    idSeguimiento: number;
    idActividad: number;
    semana: number;
    numeroCorte: number;
    periodoEtiqueta: string;
}

@Injectable()
export class EvidenciaService {
    private readonly logger = new Logger(EvidenciaService.name);

    constructor(
        @InjectRepository(Evidencia)
        private readonly evidenciaRepo: Repository<Evidencia>,
        @InjectRepository(SeguimientoSemanal)
        private readonly seguimientoRepo: Repository<SeguimientoSemanal>,
        private readonly scopeServicio: ScopeService,
        private readonly driveServicio: GoogleDriveService,
        private readonly configService: ConfigService,
    ) { }

    private async obtenerScope(user: any): Promise<UserScope> {
        return this.scopeServicio.getScope(user);
    }

    private getMaxFileSizeBytes(): number {
        const maxMb = Number(this.configService.get<string>('EVIDENCIA_MAX_FILE_SIZE_MB') || 20);
        if (!Number.isFinite(maxMb) || maxMb <= 0) return 20 * 1024 * 1024;
        return Math.floor(maxMb * 1024 * 1024);
    }

    private getStorageProvider(): 'local' | 'drive' {
        const provider = String(this.configService.get<string>('EVIDENCIA_STORAGE_PROVIDER') || 'local').trim().toLowerCase();
        return provider === 'drive' ? 'drive' : 'local';
    }

    private getUploadsBaseDir(): string {
        return join(process.cwd(), 'uploads', 'evidencias');
    }

    private getPublicBaseUrl(): string {
        const explicit = String(this.configService.get<string>('EVIDENCIA_PUBLIC_BASE_URL') || '').trim();
        if (explicit) return explicit.replace(/\/$/, '');
        const port = String(this.configService.get<string>('PORT') || process.env.PORT || '3001').trim();
        return `http://localhost:${port}`;
    }

    private async obtenerContextoSeguimiento(idSeguimiento: number, scope: UserScope): Promise<ContextoSeguimientoEvidencia> {
        const qb = this.seguimientoRepo
            .createQueryBuilder('seguimiento')
            .innerJoin('seguimiento.actividad', 'actividad')
            .innerJoin('actividad.agenda', 'agenda')
            .innerJoin('agenda.docente', 'docente')
            .innerJoin('docente.programa', 'programa')
            .innerJoin('agenda.periodo', 'periodo')
            .select('seguimiento.id_seguimiento', 'id_seguimiento')
            .addSelect('seguimiento.id_actividad', 'id_actividad')
            .addSelect('seguimiento.semana', 'semana')
            .addSelect('corte.numero_corte', 'numero_corte')
            .addSelect('periodo.anio', 'periodo_anio')
            .addSelect('periodo.periodo', 'periodo_periodo')
            .where('seguimiento.id_seguimiento = :idSeguimiento', { idSeguimiento });

        qb.innerJoin('seguimiento.corte', 'corte');

        if (scope.rol === 'DOCENTE') {
            qb.andWhere('agenda.id_docente = :idDocente', { idDocente: scope.idDocente });
        } else {
            qb.andWhere('programa.id_facultad = :idFacultad', { idFacultad: scope.idFacultad });
        }

        const contexto = await qb.getRawOne();
        if (!contexto) {
            throw new NotFoundException('Seguimiento no encontrado o fuera de alcance');
        }

        const anio = Number(contexto.periodo_anio);
        const periodo = String(contexto.periodo_periodo || '').trim();
        const idActividad = Number(contexto.id_actividad);
        const semana = Number(contexto.semana);
        const numeroCorte = Number(contexto.numero_corte);
        if (!anio || !periodo || !idActividad || !semana || !numeroCorte) {
            throw new ServiceUnavailableException('No se pudo determinar el contexto academico del seguimiento');
        }

        return {
            idSeguimiento: Number(contexto.id_seguimiento),
            idActividad,
            semana,
            numeroCorte,
            periodoEtiqueta: `${anio}-${periodo}`,
        };
    }

    private getTimestampEtiqueta(fecha = new Date()): string {
        const yyyy = fecha.getFullYear();
        const MM = String(fecha.getMonth() + 1).padStart(2, '0');
        const dd = String(fecha.getDate()).padStart(2, '0');
        const HH = String(fecha.getHours()).padStart(2, '0');
        const mm = String(fecha.getMinutes()).padStart(2, '0');
        const ss = String(fecha.getSeconds()).padStart(2, '0');
        return `${yyyy}${MM}${dd}_${HH}${mm}${ss}`;
    }

    private construirNombreBaseArchivo(contexto: ContextoSeguimientoEvidencia, consecutivo: number, timestamp: string): string {
        const etiquetaConsecutivo = String(consecutivo).padStart(3, '0');
        return `${contexto.periodoEtiqueta}_C${contexto.numeroCorte}_S${contexto.semana}`
            + `_ACT${contexto.idActividad}_SEG${contexto.idSeguimiento}_EVD${etiquetaConsecutivo}_${timestamp}.pdf`;
    }

    private async construirNombreArchivoUnico(
        contexto: ContextoSeguimientoEvidencia,
        folderId: string,
    ): Promise<string> {
        const timestamp = this.getTimestampEtiqueta(new Date());

        let consecutivo = 1;
        // Limite defensivo para evitar loops infinitos ante errores de API.
        while (consecutivo <= 999) {
            const nombre = this.construirNombreBaseArchivo(contexto, consecutivo, timestamp);
            const existe = await this.driveServicio.existeArchivoConNombre(folderId, nombre);
            if (!existe) {
                return nombre;
            }
            consecutivo += 1;
        }

        throw new ServiceUnavailableException('No se pudo generar un nombre unico para la evidencia en Google Drive');
    }

    private async guardarArchivoLocal(
        contexto: ContextoSeguimientoEvidencia,
        archivo: any,
    ): Promise<{ nombreArchivo: string; rutaPublica: string; rutaFisica: string }> {
        const baseDir = this.getUploadsBaseDir();
        await mkdir(baseDir, { recursive: true });

        const timestamp = this.getTimestampEtiqueta(new Date());
        let consecutivo = 1;
        let nombreArchivo = '';
        let rutaFisica = '';

        while (consecutivo <= 999) {
            nombreArchivo = this.construirNombreBaseArchivo(contexto, consecutivo, timestamp);
            rutaFisica = join(baseDir, nombreArchivo);

            try {
                await access(rutaFisica, fsConstants.F_OK);
                consecutivo += 1;
            } catch {
                break;
            }
        }

        if (!nombreArchivo || !rutaFisica || consecutivo > 999) {
            throw new ServiceUnavailableException('No se pudo generar un nombre unico para la evidencia local');
        }

        await writeFile(rutaFisica, archivo.buffer);
        const rutaPublica = `${this.getPublicBaseUrl()}/uploads/evidencias/${nombreArchivo}`;
        return { nombreArchivo, rutaPublica, rutaFisica };
    }

    private async validarAccesoSeguimiento(idSeguimiento: number, scope: UserScope) {
        await this.obtenerContextoSeguimiento(idSeguimiento, scope);
    }

    private construirMensajeErrorRepositorio(error: any): string {
        const mensajeExterno = String(
            error?.response?.data?.error?.message
            || error?.message
            || '',
        ).trim();

        const lower = mensajeExterno.toLowerCase();
        if (lower.includes('service accounts do not have storage quota')) {
            return 'No se pudo acceder a la carpeta configurada de Google Drive. Verifique el ID de carpeta y los permisos de la cuenta uniputumayoagendas@gmail.com.';
        }

        if (lower.includes('insufficient permissions') || lower.includes('forbidden')) {
            return 'No se pudo acceder a la carpeta configurada de Google Drive. Verifique el ID de carpeta y los permisos de la cuenta uniputumayoagendas@gmail.com.';
        }

        return 'No se pudo guardar la evidencia en el repositorio institucional';
    }

    private async validarAccesoEvidencia(idEvidencia: number, scope: UserScope) {
        const evidencia = await this.evidenciaRepo.findOne({ where: { id_evidencia: idEvidencia } });
        if (!evidencia) {
            throw new NotFoundException('Evidencia no encontrada');
        }
        await this.validarAccesoSeguimiento(evidencia.id_seguimiento, scope);
        return evidencia;
    }

    private async obtenerEvidenciaRaw(idEvidencia: number): Promise<Record<string, any> | null> {
        const filas = await this.evidenciaRepo.query(
            'SELECT * FROM evidencia WHERE id_evidencia = ? LIMIT 1',
            [idEvidencia],
        );

        if (!Array.isArray(filas) || filas.length === 0) {
            return null;
        }

        return filas[0] as Record<string, any>;
    }

    private extraerGoogleFileIdDesdeRuta(rutaArchivo: string): string | null {
        const ruta = String(rutaArchivo || '').trim();
        if (!ruta) return null;

        const matchDirecto = ruta.match(/\/d\/([a-zA-Z0-9_-]+)/);
        if (matchDirecto?.[1]) {
            return matchDirecto[1];
        }

        try {
            const parsed = new URL(ruta);
            const fileId = parsed.searchParams.get('id');
            if (fileId) {
                return fileId;
            }
        } catch {
            return null;
        }

        return null;
    }

    private extraerGoogleFileId(evidenciaRaw: Record<string, any>): string | null {
        const idDesdeCampo = String(evidenciaRaw?.google_file_id || '').trim();
        if (idDesdeCampo) {
            return idDesdeCampo;
        }

        return this.extraerGoogleFileIdDesdeRuta(String(evidenciaRaw?.ruta_archivo || ''));
    }

    private esRutaArchivoLocal(rutaArchivo: string): boolean {
        return String(rutaArchivo || '').toLowerCase().includes('/uploads/evidencias/');
    }

    private async eliminarArchivoLocalSiExiste(nombreArchivo: string): Promise<void> {
        const nombre = String(nombreArchivo || '').trim();
        if (!nombre) return;

        const rutaFisica = join(this.getUploadsBaseDir(), nombre);
        try {
            await unlink(rutaFisica);
            this.logger.log(`[EvidenciaDelete] Archivo local eliminado ruta=${rutaFisica}`);
        } catch (error: any) {
            if (error?.code === 'ENOENT') {
                return;
            }
            throw new ServiceUnavailableException('No se pudo eliminar el archivo de evidencia almacenado en el servidor');
        }
    }

    private async eliminarArchivoPersistido(evidenciaRaw: Record<string, any>): Promise<void> {
        const googleFileId = this.extraerGoogleFileId(evidenciaRaw);
        if (googleFileId) {
            await this.driveServicio.eliminarArchivo(googleFileId);
            return;
        }

        if (this.esRutaArchivoLocal(String(evidenciaRaw?.ruta_archivo || ''))) {
            await this.eliminarArchivoLocalSiExiste(String(evidenciaRaw?.nombre_archivo || ''));
        }
    }

    async listarPorSeguimiento(idSeguimiento: number, user: any) {
        const scope = await this.obtenerScope(user);
        await this.validarAccesoSeguimiento(idSeguimiento, scope);

        return await this.evidenciaRepo.find({
            where: { id_seguimiento: idSeguimiento, activo: 1 } as any,
            order: { fecha_carga: 'DESC' },
        });
    }

    async subir(
        idSeguimiento: number,
        archivo: any,
        descripcion: string | undefined,
        user: any,
    ) {
        if (!idSeguimiento) {
            throw new BadRequestException('El id_seguimiento es obligatorio');
        }

        if (!archivo) {
            throw new BadRequestException('Debe adjuntar un archivo');
        }

        if (!archivo?.buffer || !Number(archivo?.size)) {
            throw new BadRequestException('El archivo recibido no es valido');
        }

        const nombreArchivo = String(archivo.originalname || '');
        const esPdfPorMime = String(archivo.mimetype || '').toLowerCase() === 'application/pdf';
        const esPdfPorExtension = nombreArchivo.toLowerCase().endsWith('.pdf');
        if (!esPdfPorMime && !esPdfPorExtension) {
            throw new BadRequestException('Solo se permiten archivos PDF');
        }

        const maxFileSizeBytes = this.getMaxFileSizeBytes();
        if (Number(archivo.size) > maxFileSizeBytes) {
            const maxMb = Math.round((maxFileSizeBytes / (1024 * 1024)) * 10) / 10;
            throw new BadRequestException(`El archivo excede el tamano maximo permitido (${maxMb} MB)`);
        }

        const scope = await this.obtenerScope(user);
        const contexto = await this.obtenerContextoSeguimiento(idSeguimiento, scope);
        const storageProvider = this.getStorageProvider();
        this.logger.log(
            `[EvidenciaUpload] Inicio idSeguimiento=${idSeguimiento} periodo=${contexto.periodoEtiqueta} corte=${contexto.numeroCorte} semana=${contexto.semana} actividad=${contexto.idActividad} usuario=${Number(user?.id_usuario ?? user?.sub)} storage=${storageProvider}`,
        );

        let fileIdDrive = '';
        let archivoLocalFisico = '';
        try {
            let nombreArchivoFinal = '';
            let rutaArchivoFinal = '';

            if (storageProvider === 'local') {
                const local = await this.guardarArchivoLocal(contexto, archivo);
                nombreArchivoFinal = local.nombreArchivo;
                rutaArchivoFinal = local.rutaPublica;
                archivoLocalFisico = local.rutaFisica;
                this.logger.log(`[EvidenciaUpload] Archivo guardado local=${archivoLocalFisico}`);
            } else {
                const folderId = await this.driveServicio.asegurarEstructuraEvidencias({
                    periodo: contexto.periodoEtiqueta,
                    numeroCorte: contexto.numeroCorte,
                });
                this.logger.log(`[EvidenciaUpload] Carpeta final Drive folderId=${folderId}`);

                const nombreUnicoDrive = await this.construirNombreArchivoUnico(contexto, folderId);
                this.logger.log(`[EvidenciaUpload] Nombre final archivo=${nombreUnicoDrive}`);

                const resultadoSubida = await this.driveServicio.subirPdf({
                    parentFolderId: folderId,
                    fileName: nombreUnicoDrive,
                    mimeType: 'application/pdf',
                    buffer: archivo.buffer,
                });
                fileIdDrive = resultadoSubida.fileId;
                nombreArchivoFinal = nombreUnicoDrive;
                rutaArchivoFinal = resultadoSubida.webViewLink;
                this.logger.log(`[EvidenciaUpload] Archivo subido fileId=${fileIdDrive}`);
            }

            const evidencia = this.evidenciaRepo.create({
                id_seguimiento: idSeguimiento,
                nombre_archivo: nombreArchivoFinal,
                ruta_archivo: rutaArchivoFinal,
                descripcion: descripcion ? String(descripcion).trim() || null : null,
                usuario_carga: Number(user?.id_usuario ?? user?.sub),
                validado: 0,
                activo: 1,
            } as any);

            const guardada = await this.evidenciaRepo.save(evidencia as any);
            const evidenciaGuardada = Array.isArray(guardada) ? guardada[0] : guardada;
            this.logger.log(`[EvidenciaUpload] Metadata guardada en BD idEvidencia=${evidenciaGuardada?.id_evidencia || 'N/A'}`);
            return evidenciaGuardada;
        } catch (error: any) {
            this.logger.error(
                `[EvidenciaUpload] Error en flujo de subida idSeguimiento=${idSeguimiento}: ${String(error?.message || error)}`,
                error?.stack,
            );
            if (storageProvider === 'drive' && fileIdDrive) {
                try {
                    await this.driveServicio.eliminarArchivo(fileIdDrive);
                    this.logger.warn(`[EvidenciaUpload] Rollback en Drive aplicado fileId=${fileIdDrive}`);
                } catch {
                    // No interrumpir la respuesta principal por fallo en rollback de Drive.
                }
            }

            if (storageProvider === 'local' && archivoLocalFisico) {
                try {
                    await unlink(archivoLocalFisico);
                    this.logger.warn(`[EvidenciaUpload] Rollback local aplicado archivo=${archivoLocalFisico}`);
                } catch {
                    // No interrumpir la respuesta principal por fallo en rollback local.
                }
            }

            if (error instanceof HttpException) {
                throw error;
            }

            throw new ServiceUnavailableException(this.construirMensajeErrorRepositorio(error));
        }
    }

    async eliminar(idEvidencia: number, user: any) {
        const scope = await this.obtenerScope(user);
        const evidencia = await this.validarAccesoEvidencia(idEvidencia, scope);

        if (Number(evidencia.validado) === 1) {
            throw new ForbiddenException('No se puede eliminar una evidencia ya validada');
        }

        const evidenciaRaw = await this.obtenerEvidenciaRaw(idEvidencia);
        if (!evidenciaRaw) {
            throw new NotFoundException('Evidencia no encontrada');
        }

        try {
            await this.eliminarArchivoPersistido(evidenciaRaw);
        } catch (error: any) {
            if (error instanceof HttpException) {
                throw error;
            }
            throw new ServiceUnavailableException('No se pudo eliminar el archivo asociado a la evidencia');
        }

        const resultado = await this.evidenciaRepo.delete({ id_evidencia: idEvidencia } as any);
        if (!resultado?.affected) {
            throw new ServiceUnavailableException('No se pudo eliminar el registro de evidencia en base de datos');
        }

        return { ok: true, id_evidencia: idEvidencia };
    }
}
