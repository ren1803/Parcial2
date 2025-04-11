
document.addEventListener('DOMContentLoaded', async () => {

    const dataProcessor = new DataProcessor();

    // Cargar datos
    await dataProcessor.loadData();


    const charts = new Charts(dataProcessor);
    charts.initCharts();

    // Manejar cambios en el período de tiempo
    document.getElementById('time-period').addEventListener('change', function () {
        const period = this.value;
        dataProcessor.setTimePeriod(period);
        charts.updateCharts();
    });

    // Manejar cambios en el filtro de estación
    document.getElementById('station-filter').addEventListener('change', function () {
        const stationId = this.value;
        dataProcessor.setStationFilter(stationId);
        charts.updateStationStatusChart();
    });

    // Funcionalidad de responsive
    window.addEventListener('resize', () => {
        // Actualizar los gráficos al cambiar el tamaño de la ventana
        charts.updateCharts();
    });
});