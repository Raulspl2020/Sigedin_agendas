import { Controller, Get } from '@nestjs/common';
import { AgendaService } from './agenda.service';

@Controller('periodo')
export class PeriodoController {
    constructor(private readonly agendaServicio: AgendaService) { }

    @Get('actual')
    obtenerPeriodoActual() {
        return this.agendaServicio.obtenerPeriodoActual();
    }
}
