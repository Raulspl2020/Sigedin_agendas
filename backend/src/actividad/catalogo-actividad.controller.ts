import { Controller, Get, Param } from '@nestjs/common';
import { ActividadService } from './actividad.service';

@Controller()
export class CatalogoActividadController {
    constructor(private readonly actividadServicio: ActividadService) { }

    @Get('tipo-actividad')
    obtenerTiposCatalogo() {
        return this.actividadServicio.obtenerTiposCatalogo();
    }

    @Get('clase-actividad/tipo/:id_tipo')
    obtenerClasesPorTipo(@Param('id_tipo') idTipo: string) {
        return this.actividadServicio.obtenerClasesPorTipo(Number(idTipo));
    }
}
