/**
 * Módulo para crear gráficos usando D3.js
 */
class Charts {
    constructor(dataProcessor) {
        this.dataProcessor = dataProcessor;
        this.colors = d3.schemeCategory10;
        this.stationColors = [
            "#1f77b4", "#ff7f0e", "#2ca02c",
            "#d62728", "#9467bd", "#8c564b"
        ];
        this.statusColors = {
            ocupacion: "#ff7f0e",
            inactividad: "#d62728",
            operativo: "#2ca02c"
        };
    }

    /**
     * Inicializa todos los gráficos
     */
    initCharts() {
        this.updateSummaryCards();
        this.createProductionChart();
        this.createOccupationPieChart();
        this.createStationOccupationChart();
        this.createBottleneckChart();
        this.createStationStatusChart();
        this.createPlantEfficiencyChart();
    }

    /**
     * Actualiza todos los gráficos
     */
    updateCharts() {
        this.updateSummaryCards();
        this.updateProductionChart();
        this.updateOccupationPieChart();
        this.updateStationOccupationChart();
        this.updateBottleneckChart();
        this.updateStationStatusChart();
        this.updatePlantEfficiencyChart();
    }

    /**
     * Actualiza las tarjetas de resumen
     */
    updateSummaryCards() {
        const summaryData = this.dataProcessor.getSummaryData();

        if (summaryData) {
            document.getElementById('total-production').textContent =
                summaryData.totalProduction.toLocaleString();

            document.getElementById('defect-rate').textContent =
                (summaryData.defectRate * 100).toFixed(2) + '%';

            document.getElementById('avg-repair-time').textContent =
                summaryData.avgRepairTime.toFixed(2) + ' min';

            document.getElementById('avg-delay').textContent =
                summaryData.avgDelay.toFixed(2) + ' min';
        }
    }


    createProductionChart() {

        const container = d3.select('#production-chart');
        const width = container.node().getBoundingClientRect().width;
        const height = 300;
        const margin = { top: 20, right: 30, bottom: 50, left: 60 };


        this.productionSvg = container.append('svg')
            .attr('width', width)
            .attr('height', height);


        this.productionG = this.productionSvg.append('g')
            .attr('transform', `translate(${margin.left},${margin.top})`);


        this.productionXAxis = this.productionG.append('g')
            .attr('transform', `translate(0,${height - margin.top - margin.bottom})`);

        this.productionYAxis = this.productionG.append('g');

        this.productionSvg.append('text')
            .attr('transform', 'rotate(-90)')
            .attr('y', 15)
            .attr('x', -height / 2)
            .attr('text-anchor', 'middle')
            .text('Producción');


        this.updateProductionChart();
    }


    updateProductionChart() {
        const rawData = this.dataProcessor.getProductionData() || [];
        const data = rawData.filter(d => d && d.fecha && d.produccion != null);

        if (data.length === 0) return;

        const width = this.productionSvg.node().getBoundingClientRect().width;
        const height = this.productionSvg.node().getBoundingClientRect().height;
        const margin = { top: 20, right: 30, bottom: 50, left: 60 };
        const chartWidth = width - margin.left - margin.right;
        const chartHeight = height - margin.top - margin.bottom;

        const yScale = d3.scaleLinear()
            .domain([0, d3.max(data, d => d.produccion) * 1.1])
            .range([chartHeight, 0]);

        const period = this.dataProcessor.currentPeriod || 'daily';
        let xScale;

        if (period === 'daily') {
            const dates = data.map(d => new Date(d.fecha));
            xScale = d3.scaleTime()
                .domain(d3.extent(dates))
                .range([0, chartWidth]);

            this.productionXAxis.call(
                d3.axisBottom(xScale).ticks(5).tickFormat(d3.timeFormat('%d/%m'))
            );
        } else {
            const periodos = data.map(d => d.periodo).filter(Boolean);
            if (periodos.length === 0) return;

            xScale = d3.scaleBand()
                .domain(periodos)
                .range([0, chartWidth])
                .padding(0.2);

            this.productionXAxis.call(d3.axisBottom(xScale));
        }

        this.productionYAxis.call(d3.axisLeft(yScale));

        if (period === 'daily') {
            const line = d3.line()
                .defined(d => d && d.fecha && d.produccion != null)
                .x(d => xScale(new Date(d.fecha)))
                .y(d => yScale(d.produccion))
                .curve(d3.curveMonotoneX);

            this.productionG.selectAll('.bar').remove();

            const path = this.productionG.selectAll('.line').data([data]);

            path.enter()
                .append('path')
                .attr('class', 'line')
                .attr('fill', 'none')
                .attr('stroke', this.colors[0])
                .attr('stroke-width', 2)
                .merge(path)
                .transition()
                .duration(750)
                .attr('d', line);

            const points = this.productionG.selectAll('.point').data(data);

            points.exit().remove();

            points.enter()
                .append('circle')
                .attr('class', 'point')
                .attr('r', 3)
                .attr('fill', this.colors[0])
                .merge(points)
                .transition()
                .duration(750)
                .attr('cx', d => xScale(new Date(d.fecha)))
                .attr('cy', d => yScale(d.produccion));
        } else {
            this.productionG.selectAll('.line').remove();
            this.productionG.selectAll('.point').remove();

            const bars = this.productionG.selectAll('.bar').data(data);

            bars.exit().remove();

            bars.enter()
                .append('rect')
                .attr('class', 'bar')
                .attr('fill', this.colors[0])
                .merge(bars)
                .transition()
                .duration(750)
                .attr('x', d => xScale(d.periodo))
                .attr('y', d => yScale(d.produccion))
                .attr('width', xScale.bandwidth())
                .attr('height', d => chartHeight - yScale(d.produccion));
        }
    }



    createOccupationPieChart() {

        const container = d3.select('#occupation-pie-chart');
        const width = container.node().getBoundingClientRect().width;
        const height = 300;
        const radius = Math.min(width, height) / 2 - 40;


        this.occupationPieSvg = container.append('svg')
            .attr('width', width)
            .attr('height', height);


        this.occupationPieG = this.occupationPieSvg.append('g')
            .attr('transform', `translate(${width / 2},${height / 2})`);


        this.occupationPieLegend = container.append('div')
            .attr('class', 'legend');

        // Actualizar el gráfico
        this.updateOccupationPieChart();
    }

    /**
     * Actualiza el gráfico de distribución de ocupación
     */
    updateOccupationPieChart() {
        const data = this.dataProcessor.getOccupationDistribution();
        if (!data || data.length === 0) return;

        const width = this.occupationPieSvg.node().getBoundingClientRect().width;
        const height = this.occupationPieSvg.node().getBoundingClientRect().height;
        const radius = Math.min(width, height) / 2 - 40;


        const arc = d3.arc()
            .innerRadius(0)
            .outerRadius(radius);

        // Función para generar el pie
        const pie = d3.pie()
            .value(d => d.valor)
            .sort(null);

        // Colores
        const colorScale = d3.scaleOrdinal()
            .domain(data.map(d => d.estado))
            .range([this.statusColors.ocupacion, this.statusColors.inactividad, this.statusColors.operativo]);

        // Actualizar o crear sectores
        const arcs = this.occupationPieG.selectAll('.arc')
            .data(pie(data));

        arcs.exit().remove();

        const newArcs = arcs.enter()
            .append('g')
            .attr('class', 'arc');

        newArcs.append('path')
            .attr('fill', d => colorScale(d.data.estado));

        newArcs.append('text')
            .attr('transform', d => `translate(${arc.centroid(d)})`)
            .attr('dy', '.35em')
            .attr('text-anchor', 'middle')
            .style('fill', '#fff')
            .style('font-size', '12px');

        const allArcs = newArcs.merge(arcs);

        allArcs.select('path')
            .transition()
            .duration(750)
            .attrTween('d', function (d) {
                const interpolate = d3.interpolate(this._current || d, d);
                this._current = interpolate(0);
                return t => arc(interpolate(t));
            });

        allArcs.select('text')
            .transition()
            .duration(750)
            .attr('transform', d => `translate(${arc.centroid(d)})`)
            .text(d => `${(d.data.valor * 100).toFixed(1)}%`);

        // Actualizar leyenda
        this.occupationPieLegend.html('');

        data.forEach((d, i) => {
            const legendItem = this.occupationPieLegend.append('div')
                .attr('class', 'legend-item');

            legendItem.append('div')
                .attr('class', 'legend-color')
                .style('background-color', colorScale(d.estado));

            legendItem.append('span')
                .text(d.estado);
        });
    }

    createStationOccupationChart() {

        this.stationContainer = d3.select('#station-occupation-chart');
        const width = this.stationContainer.node().getBoundingClientRect().width;
        const height = 300;
        const margin = { top: 20, right: 30, bottom: 50, left: 60 };


        this.stationOccupationSvg = this.stationContainer.append('svg')
            .attr('width', width)
            .attr('height', height);


        this.stationOccupationG = this.stationOccupationSvg.append('g')
            .attr('transform', `translate(${margin.left},${margin.top})`);


        this.stationOccupationXAxis = this.stationOccupationG.append('g')
            .attr('transform', `translate(0,${height - margin.top - margin.bottom})`);


        this.stationOccupationYAxis = this.stationOccupationG.append('g');


        this.stationOccupationSvg.append('text')
            .attr('transform', 'rotate(-90)')
            .attr('y', 15)
            .attr('x', -height / 2)
            .attr('text-anchor', 'middle')
            .text('Ocupación');


        this.stationOccupationSvg.append('text')
            .attr('y', height - 10)
            .attr('x', width / 2)
            .attr('text-anchor', 'middle')
            .text('Estación');


        this.updateStationOccupationChart();
    }


    updateStationOccupationChart() {
        const data = this.dataProcessor.getStationOccupationData();
        if (!data || data.length === 0) return;

        const width = this.stationOccupationSvg.node().getBoundingClientRect().width;
        const height = this.stationOccupationSvg.node().getBoundingClientRect().height;
        const margin = { top: 20, right: 30, bottom: 50, left: 60 };
        const chartWidth = width - margin.left - margin.right;
        const chartHeight = height - margin.top - margin.bottom;


        const stackedData = data.map(d => ({
            estacion_id: d.estacion_id,
            Ocupado: d.ocupacion,
            Inactivo: d.inactividad,
            Operativo: d.tiempo_operativo
        }));


        const xScale = d3.scaleBand()
            .domain(data.map(d => d.estacion_id))
            .range([0, chartWidth])
            .padding(0.2);

        const yScale = d3.scaleLinear()
            .domain([0, 1])
            .range([chartHeight, 0]);


        this.stationOccupationXAxis.call(
            d3.axisBottom(xScale).tickFormat(d => `Estación ${d}`)
        );

        this.stationOccupationYAxis.call(
            d3.axisLeft(yScale).tickFormat(d => `${(d * 100).toFixed(0)}%`)
        );


        const stack = d3.stack()
            .keys(['Ocupado', 'Inactivo', 'Operativo'])
            .order(d3.stackOrderNone)
            .offset(d3.stackOffsetNone);

        const series = stack(stackedData);

        // Colores
        const colorScale = d3.scaleOrdinal()
            .domain(['Ocupado', 'Inactivo', 'Operativo'])
            .range([this.statusColors.ocupacion, this.statusColors.inactividad, this.statusColors.operativo]);

        // Crear grupos para cada serie
        const bars = this.stationOccupationG.selectAll('.serie')
            .data(series);

        bars.exit().remove();

        const newBars = bars.enter()
            .append('g')
            .attr('class', 'serie')
            .attr('fill', d => colorScale(d.key));

        const allBars = newBars.merge(bars);

        // Crear rectángulos para cada valor en la serie
        const rects = allBars.selectAll('rect')
            .data(d => d);

        rects.exit().remove();

        rects.enter()
            .append('rect')
            .merge(rects)
            .transition()
            .duration(750)
            .attr('x', d => xScale(d.data.estacion_id))
            .attr('y', d => yScale(d[1]))
            .attr('height', d => {
                // Asegurar que la altura nunca sea negativa
                const height = yScale(d[0]) - yScale(d[1]);
                return Math.max(0, height);
            })
            .attr('width', xScale.bandwidth());

        // Crear leyenda
        const legendContainer = this.stationContainer.selectAll('.legend').data([0]);

        const legend = legendContainer.enter()
            .append('div')
            .attr('class', 'legend')
            .merge(legendContainer);

        const legendItems = legend.selectAll('.legend-item')
            .data(['Ocupado', 'Inactivo', 'Operativo']);

        legendItems.exit().remove();

        const newLegendItems = legendItems.enter()
            .append('div')
            .attr('class', 'legend-item');

        newLegendItems.append('div')
            .attr('class', 'legend-color');

        newLegendItems.append('span');

        const allLegendItems = newLegendItems.merge(legendItems);

        allLegendItems.select('.legend-color')
            .style('background-color', d => colorScale(d));

        allLegendItems.select('span')
            .text(d => d);
    }

    /**
     * Crea el gráfico de análisis de cuellos de botella
     */
    createBottleneckChart() {
        // Configuración del gráfico
        this.bottleneckContainer = d3.select('#bottleneck-chart');
        const width = this.bottleneckContainer.node().getBoundingClientRect().width;
        const height = 300;
        const margin = { top: 20, right: 30, bottom: 50, left: 60 };

        // Crear SVG
        this.bottleneckSvg = this.bottleneckContainer.append('svg')
            .attr('width', width)
            .attr('height', height);

        // Grupo principal
        this.bottleneckG = this.bottleneckSvg.append('g')
            .attr('transform', `translate(${margin.left},${margin.top})`);

        // Eje X
        this.bottleneckXAxis = this.bottleneckG.append('g')
            .attr('transform', `translate(0,${height - margin.top - margin.bottom})`);

        // Eje Y
        this.bottleneckYAxis = this.bottleneckG.append('g');

        // Etiqueta del eje Y
        this.bottleneckSvg.append('text')
            .attr('transform', 'rotate(-90)')
            .attr('y', 15)
            .attr('x', -height / 2)
            .attr('text-anchor', 'middle')
            .text('Ocupación');

        // Etiqueta del eje X
        this.bottleneckSvg.append('text')
            .attr('y', height - 10)
            .attr('x', width / 2)
            .attr('text-anchor', 'middle')
            .text('Estación');

        // Actualizar el gráfico
        this.updateBottleneckChart();
    }

    /**
     * Actualiza el gráfico de análisis de cuellos de botella
     */
    updateBottleneckChart() {
        const data = this.dataProcessor.getBottleneckData();
        if (!data || data.length === 0) return;

        const width = this.bottleneckSvg.node().getBoundingClientRect().width;
        const height = this.bottleneckSvg.node().getBoundingClientRect().height;
        const margin = { top: 20, right: 30, bottom: 50, left: 60 };
        const chartWidth = width - margin.left - margin.right;
        const chartHeight = height - margin.top - margin.bottom;

        // Escalas
        const xScale = d3.scaleBand()
            .domain(data.map(d => d.estacion_id))
            .range([0, chartWidth])
            .padding(0.2);

        const yScale = d3.scaleLinear()
            .domain([0, 1])
            .range([chartHeight, 0]);

        // Actualizar ejes
        this.bottleneckXAxis.call(
            d3.axisBottom(xScale).tickFormat(d => `Estación ${d}`)
        );

        this.bottleneckYAxis.call(
            d3.axisLeft(yScale).tickFormat(d => `${(d * 100).toFixed(0)}%`)
        );

        // Línea de umbral para cuellos de botella
        const threshold = this.bottleneckG.selectAll('.threshold')
            .data([0.7]);

        threshold.exit().remove();

        const newThreshold = threshold.enter()
            .append('line')
            .attr('class', 'threshold')
            .attr('stroke', 'red')
            .attr('stroke-dasharray', '4')
            .attr('stroke-width', 1);

        threshold.merge(newThreshold)
            .transition()
            .duration(750)
            .attr('x1', 0)
            .attr('x2', chartWidth)
            .attr('y1', yScale(0.7))
            .attr('y2', yScale(0.7));

        // Barras
        const bars = this.bottleneckG.selectAll('.bar')
            .data(data);

        bars.exit().remove();

        const newBars = bars.enter()
            .append('rect')
            .attr('class', 'bar');

        bars.merge(newBars)
            .transition()
            .duration(750)
            .attr('x', d => xScale(d.estacion_id))
            .attr('y', d => yScale(d.ocupacion_promedio))
            .attr('height', d => chartHeight - yScale(d.ocupacion_promedio))
            .attr('width', xScale.bandwidth())
            .attr('fill', d => d.posible_cuello_botella ? 'red' : '#1f77b4');

        // Etiquetas
        const labels = this.bottleneckG.selectAll('.bar-label')
            .data(data);

        labels.exit().remove();

        const newLabels = labels.enter()
            .append('text')
            .attr('class', 'bar-label')
            .attr('text-anchor', 'middle')
            .attr('fill', 'black')
            .attr('font-size', '12px');

        labels.merge(newLabels)
            .transition()
            .duration(750)
            .attr('x', d => xScale(d.estacion_id) + xScale.bandwidth() / 2)
            .attr('y', d => yScale(d.ocupacion_promedio) - 5)
            .text(d => `${(d.ocupacion_promedio * 100).toFixed(0)}%`);
    }

    /**
     * Crea el gráfico de estado de las estaciones
     */
    createStationStatusChart() {
        // Configuración del gráfico
        this.statusContainer = d3.select('#station-status-chart');
        const width = this.statusContainer.node().getBoundingClientRect().width;
        const height = 300;
        const margin = { top: 20, right: 30, bottom: 50, left: 60 };

        // Crear SVG
        this.stationStatusSvg = this.statusContainer.append('svg')
            .attr('width', width)
            .attr('height', height);

        // Grupo principal
        this.stationStatusG = this.stationStatusSvg.append('g')
            .attr('transform', `translate(${margin.left},${margin.top})`);

        // Eje X
        this.stationStatusXAxis = this.stationStatusG.append('g')
            .attr('transform', `translate(0,${height - margin.top - margin.bottom})`);

        // Eje Y
        this.stationStatusYAxis = this.stationStatusG.append('g');

        // Etiqueta del eje Y
        this.stationStatusSvg.append('text')
            .attr('transform', 'rotate(-90)')
            .attr('y', 15)
            .attr('x', -height / 2)
            .attr('text-anchor', 'middle')
            .text('Porcentaje');

        // Leyenda
        const legendContainer = this.statusContainer.append('div')
            .attr('class', 'legend');

        const statusTypes = ['Ocupado', 'Inactivo', 'Operativo'];
        const statusColors = [
            this.statusColors.ocupacion,
            this.statusColors.inactividad,
            this.statusColors.operativo
        ];

        statusTypes.forEach((status, i) => {
            const legendItem = legendContainer.append('div')
                .attr('class', 'legend-item');

            legendItem.append('div')
                .attr('class', 'legend-color')
                .style('background-color', statusColors[i]);

            legendItem.append('span')
                .text(status);
        });

        // Actualizar el gráfico
        this.updateStationStatusChart();
    }

    /**
     * Actualiza el gráfico de estado de las estaciones
     */
    updateStationStatusChart() {
        const data = this.dataProcessor.getStationStatusData();
        if (!data || data.length === 0) return;

        const width = this.stationStatusSvg.node().getBoundingClientRect().width;
        const height = this.stationStatusSvg.node().getBoundingClientRect().height;
        const margin = { top: 20, right: 30, bottom: 50, left: 60 };
        const chartWidth = width - margin.left - margin.right;
        const chartHeight = height - margin.top - margin.bottom;

        // Filtrar datos según el filtro de estación
        let filteredData = data;
        if (this.dataProcessor.currentStationFilter !== 'all') {
            const stationId = parseInt(this.dataProcessor.currentStationFilter);
            filteredData = data.map(d => ({
                fecha: d.fecha,
                ocupacion: d[`estacion_${stationId}_ocupacion`] || 0,
                inactividad: d[`estacion_${stationId}_inactividad`] || 0,
                operativo: d[`estacion_${stationId}_operativo`] || 0
            }));
        } else {
            // Promediar por fecha
            filteredData = data.map(d => {
                const stationCount = 6;
                let ocupacion = 0;
                let inactividad = 0;
                let operativo = 0;

                for (let i = 0; i < stationCount; i++) {
                    ocupacion += d[`estacion_${i}_ocupacion`] || 0;
                    inactividad += d[`estacion_${i}_inactividad`] || 0;
                    operativo += d[`estacion_${i}_operativo`] || 0;
                }

                return {
                    fecha: d.fecha,
                    ocupacion: ocupacion / stationCount,
                    inactividad: inactividad / stationCount,
                    operativo: operativo / stationCount
                };
            });
        }

        // Limitar a 10 fechas más recientes para mejor visualización
        filteredData = filteredData.slice(-10);

        // Escalas
        const xScale = d3.scaleBand()
            .domain(filteredData.map(d => d.fecha))
            .range([0, chartWidth])
            .padding(0.2);

        const yScale = d3.scaleLinear()
            .domain([0, 1])
            .range([chartHeight, 0]);

        // Actualizar ejes
        this.stationStatusXAxis.call(
            d3.axisBottom(xScale)
                .tickFormat(d => {
                    const date = new Date(d);
                    return `${date.getDate()}/${date.getMonth() + 1}`;
                })
        )
            .selectAll("text")
            .attr("transform", "rotate(-45)")
            .style("text-anchor", "end");

        this.stationStatusYAxis.call(
            d3.axisLeft(yScale).tickFormat(d => `${(d * 100).toFixed(0)}%`)
        );

        // Preparar datos para gráfico apilado
        const stackedData = filteredData.map(d => ({
            fecha: d.fecha,
            Ocupado: d.ocupacion,
            Inactivo: d.inactividad,
            Operativo: d.operativo
        }));

        // Stack data
        const stack = d3.stack()
            .keys(['Ocupado', 'Inactivo', 'Operativo'])
            .order(d3.stackOrderNone)
            .offset(d3.stackOffsetNone);

        const series = stack(stackedData);

        // Colores
        const colorScale = d3.scaleOrdinal()
            .domain(['Ocupado', 'Inactivo', 'Operativo'])
            .range([this.statusColors.ocupacion, this.statusColors.inactividad, this.statusColors.operativo]);

        // Crear grupos para cada serie
        const bars = this.stationStatusG.selectAll('.serie')
            .data(series);

        bars.exit().remove();

        const newBars = bars.enter()
            .append('g')
            .attr('class', 'serie')
            .attr('fill', d => colorScale(d.key));

        const allBars = newBars.merge(bars);

        // Crear rectángulos para cada valor en la serie
        const rects = allBars.selectAll('rect')
            .data(d => d);

        rects.exit().remove();

        rects.enter()
            .append('rect')
            .merge(rects)
            .transition()
            .duration(750)
            .attr('x', d => xScale(d.data.fecha))
            .attr('y', d => yScale(d[1]))
            .attr('height', d => {
                const height = yScale(d[0]) - yScale(d[1]);
                return Math.max(0, height);
            })
            .attr('width', xScale.bandwidth());
    }

    /**
     * Crea el gráfico de eficiencia de la planta
     */
    createPlantEfficiencyChart() {
        // Configuración del gráfico
        const container = d3.select('#plant-efficiency-chart');
        const width = container.node().getBoundingClientRect().width;
        const height = 300;
        const margin = { top: 20, right: 30, bottom: 50, left: 60 };

        // Crear SVG
        this.efficiencySvg = container.append('svg')
            .attr('width', width)
            .attr('height', height);

        // Grupo principal
        this.efficiencyG = this.efficiencySvg.append('g')
            .attr('transform', `translate(${margin.left},${margin.top})`);

        // Eje X
        this.efficiencyXAxis = this.efficiencyG.append('g')
            .attr('transform', `translate(0,${height - margin.top - margin.bottom})`);

        // Eje Y
        this.efficiencyYAxis = this.efficiencyG.append('g');

        // Etiqueta del eje Y
        this.efficiencySvg.append('text')
            .attr('transform', 'rotate(-90)')
            .attr('y', 15)
            .attr('x', -height / 2)
            .attr('text-anchor', 'middle')
            .text('Eficiencia');

        // Línea de referencia
        this.efficiencyG.append('line')
            .attr('class', 'reference-line')
            .attr('stroke', '#ccc')
            .attr('stroke-dasharray', '4');

        // Actualizar el gráfico
        this.updatePlantEfficiencyChart();
    }

    /**
     * Actualiza el gráfico de eficiencia de la planta
     */
    updatePlantEfficiencyChart() {
        const data = this.dataProcessor.getPlantEfficiencyData();
        if (!data || data.length === 0) return;

        const width = this.efficiencySvg.node().getBoundingClientRect().width;
        const height = this.efficiencySvg.node().getBoundingClientRect().height;
        const margin = { top: 20, right: 30, bottom: 50, left: 60 };
        const chartWidth = width - margin.left - margin.right;
        const chartHeight = height - margin.top - margin.bottom;

        // Limitar a 30 fechas más recientes para mejor visualización
        const limitedData = data.slice(-30);

        // Escalas
        const xScale = d3.scaleTime()
            .domain(d3.extent(limitedData, d => new Date(d.fecha)))
            .range([0, chartWidth]);

        const yScale = d3.scaleLinear()
            .domain([0, 1])
            .range([chartHeight, 0]);

        // Actualizar ejes
        this.efficiencyXAxis.call(d3.axisBottom(xScale).ticks(5).tickFormat(d3.timeFormat('%d/%m')));

        this.efficiencyYAxis.call(
            d3.axisLeft(yScale).tickFormat(d => `${(d * 100).toFixed(0)}%`)
        );

        // Actualizar línea de referencia
        this.efficiencyG.select('.reference-line')
            .transition()
            .duration(750)
            .attr('x1', 0)
            .attr('x2', chartWidth)
            .attr('y1', yScale(0.7))
            .attr('y2', yScale(0.7));

        // Actualizar o crear puntos
        const points = this.efficiencyG.selectAll('.efficiency-point')
            .data(limitedData);

        points.exit().remove();

        const newPoints = points.enter()
            .append('circle')
            .attr('class', 'efficiency-point')
            .attr('r', 3)
            .attr('fill', '#1f77b4');

        points.merge(newPoints)
            .transition()
            .duration(750)
            .attr('cx', d => xScale(new Date(d.fecha)))
            .attr('cy', d => yScale(d.eficiencia));
    }
}