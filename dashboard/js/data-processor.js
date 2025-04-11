
class DataProcessor {
    constructor() {
        this.data = null;
        this.currentPeriod = 'daily';
        this.currentStationFilter = 'all';
    }


    async loadData() {
        try {
            const response = await fetch('../data/dashboard_data.json');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            this.data = await response.json();
            return this.data;
        } catch (error) {
            console.error('Error al cargar los datos:', error);
            throw new Error('No se pudieron cargar los datos del dashboard');
        }
    }


    formatDate(date) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }


    setTimePeriod(period) {
        this.currentPeriod = period;
    }


    setStationFilter(stationId) {
        this.currentStationFilter = stationId;
    }

    getProductionData() {
        if (!this.data) return [];

        if (this.currentPeriod === 'daily') {
            return this.data.company.map(d => ({
                fecha: d.fecha,
                produccion: d.produccion_final
            }));
        } else {
            return this.data.time_periods[this.currentPeriod].map(d => ({
                periodo: d.periodo,
                produccion: d.produccion_total
            }));
        }
    }


    getStationOccupationData() {
        if (!this.data) return [];

        const stationData = {};


        for (let i = 0; i < 6; i++) {
            stationData[i] = {
                estacion_id: i,
                ocupacion_promedio: 0,
                inactividad_promedio: 0,
                count: 0
            };
        }


        let filteredData = this.data.workstation;


        filteredData.forEach(d => {
            stationData[d.estacion_id].ocupacion_promedio += d.ocupacion;
            stationData[d.estacion_id].inactividad_promedio += d.inactividad;
            stationData[d.estacion_id].count++;
        });

        // Calcular los promedios finales
        const result = Object.values(stationData).map(d => {
            if (d.count > 0) {
                d.ocupacion_promedio /= d.count;
                d.inactividad_promedio /= d.count;
            }
            return {
                estacion_id: d.estacion_id,
                ocupacion: d.ocupacion_promedio,
                inactividad: d.inactividad_promedio,
                tiempo_operativo: 1 - d.ocupacion_promedio - d.inactividad_promedio
            };
        });

        return result;
    }


    getBottleneckData() {
        if (!this.data || !this.data.bottlenecks) return [];
        return this.data.bottlenecks;
    }


    getStationStatusData() {
        if (!this.data) return [];


        let filteredData = this.data.workstation;
        if (this.currentStationFilter !== 'all') {
            filteredData = filteredData.filter(d => d.estacion_id.toString() === this.currentStationFilter);
        }


        const groupedByDate = {};
        filteredData.forEach(d => {
            if (!groupedByDate[d.fecha]) {
                groupedByDate[d.fecha] = {};
            }
            groupedByDate[d.fecha][d.estacion_id] = {
                ocupacion: d.ocupacion,
                inactividad: d.inactividad,
                operativo: 1 - d.ocupacion - d.inactividad
            };
        });

        const result = Object.keys(groupedByDate).map(date => {
            const entry = { fecha: date };
            for (let stationId = 0; stationId < 6; stationId++) {
                if (groupedByDate[date][stationId]) {
                    entry[`estacion_${stationId}_ocupacion`] = groupedByDate[date][stationId].ocupacion;
                    entry[`estacion_${stationId}_inactividad`] = groupedByDate[date][stationId].inactividad;
                    entry[`estacion_${stationId}_operativo`] = groupedByDate[date][stationId].operativo;
                }
            }
            return entry;
        });

        return result;
    }


    getSummaryData() {
        if (!this.data) return null;

        let totalProduction = 0;
        let totalDefects = 0;
        let repairTimes = [];
        let delays = [];

        if (this.currentPeriod === 'daily') {
            totalProduction = this.data.company.reduce((sum, d) => sum + d.produccion_final, 0);
            const avgDefectRate = this.data.company.reduce((sum, d) => sum + d.tasa_defectos, 0) / this.data.company.length;
            totalDefects = Math.round(totalProduction * avgDefectRate);
            repairTimes = this.data.company.map(d => d.tiempo_reparacion_promedio);
            delays = this.data.company.map(d => d.retraso_promedio);
        } else {
            const periodData = this.data.time_periods[this.currentPeriod];
            totalProduction = periodData.reduce((sum, d) => sum + d.produccion_total, 0);
            const avgDefectRate = periodData.reduce((sum, d) => sum + d.tasa_defectos_promedio, 0) / periodData.length;
            totalDefects = Math.round(totalProduction * avgDefectRate);
            repairTimes = periodData.map(d => d.tiempo_reparacion_promedio);
            delays = periodData.map(d => d.ocupacion_suministro_promedio); // Usando ocupación como aproximación
        }


        const avgRepairTime = repairTimes.reduce((sum, time) => sum + time, 0) / repairTimes.length;
        const avgDelay = delays.reduce((sum, delay) => sum + delay, 0) / delays.length;
        const defectRate = totalDefects / totalProduction;

        return {
            totalProduction,
            defectRate,
            avgRepairTime,
            avgDelay
        };
    }


    getPlantEfficiencyData() {
        if (!this.data) return [];

        return this.data.company.map(d => {
            const efficiency = 1 - d.tasa_defectos - (d.retraso_promedio / 10); // Fórmula simple de eficiencia
            return {
                fecha: d.fecha,
                eficiencia: Math.max(0, Math.min(1, efficiency)) // Límite entre 0 y 1
            };
        });
    }


    getOccupationDistribution() {
        if (!this.data) return [];

        const stationData = this.getStationOccupationData();


        let totalOcupacion = 0;
        let totalInactividad = 0;
        let totalOperativo = 0;

        stationData.forEach(station => {
            totalOcupacion += station.ocupacion;
            totalInactividad += station.inactividad;
            totalOperativo += station.tiempo_operativo;
        });

        // Normalizar a porcentajes
        const total = totalOcupacion + totalInactividad + totalOperativo;

        return [
            { estado: 'Ocupado', valor: totalOcupacion / total },
            { estado: 'Inactivo', valor: totalInactividad / total },
            { estado: 'Operativo', valor: totalOperativo / total }
        ];
    }
}