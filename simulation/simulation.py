import simpy
import random
import openpyxl
import os

class WorkStation:
    def __init__(self, env, station_id, restockers, stats):
        self.env = env
        self.station_id = station_id
        self.raw_material = 25
        self.restockers = restockers
        self.process_time_mean = 4
        self.process_time_std = 1
        self.failure_probability = [0.02, 0.01, 0.05, 0.15, 0.07, 0.06][station_id]
        self.fix_time = lambda: random.expovariate(1/3)
        self.processed_count = 0
        self.stats = stats
        self.resource = simpy.Resource(env, capacity=1)

    def process(self, product):
        with self.resource.request() as req:
            yield req
            while self.raw_material <= 0:
                self.stats['esperas_reabastecimiento'][self.station_id] += 1
                yield self.env.process(self.restock())

            self.raw_material -= 1
            process_time = max(0, random.normalvariate(self.process_time_mean, self.process_time_std))
            yield self.env.timeout(process_time)
            self.processed_count += 1
            self.stats['ocupacion_estaciones'][self.station_id] += process_time

            if self.processed_count % 5 == 0 and random.random() < self.failure_probability:
                self.stats['fallos_estaciones'][self.station_id] += 1
                repair_time = self.fix_time()
                self.stats['tiempos_reparacion'].append(repair_time)
                yield self.env.timeout(repair_time)

    def restock(self):
        with self.restockers.request() as req:
            yield req
            restock_time = max(0, random.normalvariate(2, 0.5))
            self.stats['uso_dispositivo_suministro'] += restock_time
            yield self.env.timeout(restock_time)
            self.raw_material = 25

class Product:
    def __init__(self, env, id, plant, stats):
        self.env = env
        self.id = id
        self.plant = plant
        self.stats = stats
        self.stage = 0
        self.completed_stations = set()
        env.process(self.process())

    def process(self):
        while len(self.completed_stations) < 6:
            if self.stage < 4:
                station = self.plant.stations[self.stage]
                yield self.env.process(station.process(self))
                self.completed_stations.add(self.stage)
                self.stage += 1
            elif self.stage == 4:
                station4_queue = len(self.plant.stations[4].resource.queue)
                station5_queue = len(self.plant.stations[5].resource.queue)
                
                if 4 not in self.completed_stations and 5 not in self.completed_stations:
                    station_id = 4 if station4_queue <= station5_queue else 5
                elif 4 not in self.completed_stations:
                    station_id = 4
                else:
                    station_id = 5
                
                station = self.plant.stations[station_id]
                yield self.env.process(station.process(self))
                self.completed_stations.add(station_id)
                
                if len(self.completed_stations) == 6:
                    if random.random() < 0.05:
                        self.stats['productos_rechazados'] += 1
                    else:
                        self.stats['productos_completados'] += 1

class ManufacturingPlant:
    def __init__(self, env):
        self.env = env
        self.restockers = simpy.Resource(env, capacity=3)
        self.stats = {
            'productos_completados': 0,
            'productos_rechazados': 0,
            'ocupacion_estaciones': {i: 0 for i in range(6)},
            'fallos_estaciones': {i: 0 for i in range(6)},
            'esperas_reabastecimiento': {i: 0 for i in range(6)},
            'tiempos_reparacion': [],
            'uso_dispositivo_suministro': 0
        }
        self.stations = [WorkStation(env, i, self.restockers, self.stats) for i in range(6)]
        self.product_count = 0
        env.process(self.generate_products())

    def generate_products(self):
        while True:
            yield self.env.timeout(random.expovariate(1/3))
            self.product_count += 1
            Product(self.env, self.product_count, self, self.stats)

file_name = os.path.join('..', 'data', 'resultados.xlsx')

if os.path.exists(file_name):
    os.remove(file_name)

wb = openpyxl.Workbook()
ws = wb.active
ws.append([
    "Producción final",
    "Ocupación Est. 0", "Ocupación Est. 1", "Ocupación Est. 2", "Ocupación Est. 3", "Ocupación Est. 4", "Ocupación Est. 5",
    "Inactividad Est. 0", "Inactividad Est. 1", "Inactividad Est. 2", "Inactividad Est. 3", "Inactividad Est. 4", "Inactividad Est. 5",
    "Tiempo inactividad por fallos",
    "Ocupación dispositivo de suministro",
    "Tiempo promedio de reparación",
    "Retraso promedio por cuellos de botella",
    "Tasa de productos defectuosos"
])
wb.save(file_name)

for _ in range(100):
    env = simpy.Environment()
    plant = ManufacturingPlant(env)
    env.run(until=5000)

    productos_completados = plant.stats['productos_completados']
    productos_rechazados = plant.stats['productos_rechazados']
    tasa_productos_defectuosos = productos_rechazados / productos_completados if productos_completados else 0
    tiempo_total_reparaciones = sum(plant.stats['tiempos_reparacion'])
    uso_dispositivo_suministro = plant.stats['uso_dispositivo_suministro']
    retraso_promedio = uso_dispositivo_suministro / sum(plant.stats['esperas_reabastecimiento'].values()) if sum(plant.stats['esperas_reabastecimiento'].values()) else 0
    tiempos_ocupacion = plant.stats['ocupacion_estaciones']
    
    wb = openpyxl.load_workbook(file_name)
    ws = wb.active
    ws.append([
        productos_completados,
        *(tiempos_ocupacion[i] / 5000 for i in range(6)),
        *(5000 - tiempos_ocupacion[i] for i in range(6)),
        tiempo_total_reparaciones,
        uso_dispositivo_suministro / 5000,
        tiempo_total_reparaciones / len(plant.stats['tiempos_reparacion']) if plant.stats['tiempos_reparacion'] else 0,
        retraso_promedio,
        tasa_productos_defectuosos
    ])
    wb.save(file_name)

print("Simulaciones completadas y guardadas en resultados.xlsx")