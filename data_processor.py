import pandas as pd
import json
import os
import numpy as np
from datetime import datetime, timedelta

class NumpyEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, (np.integer, np.int64, np.int32, np.int16, np.int8)):
            return int(obj)
        elif isinstance(obj, (np.float64, np.float32, np.float16)):
            return float(obj)
        elif isinstance(obj, (np.bool_, np.bool)):
            return bool(obj)
        elif isinstance(obj, np.ndarray):
            return obj.tolist()
        return super(NumpyEncoder, self).default(obj)

def process_simulation_data(excel_file='./data/resultados.xlsx'):
    if not os.path.exists(excel_file):
        print(f"Error: El archivo {excel_file} no existe")
        return None
    
    df = pd.read_excel(excel_file)
    
    start_date = datetime(2025, 1, 1)
    dates = [start_date + timedelta(days=i) for i in range(len(df))]
    df['fecha'] = dates
    
    company_data = []
    for index, row in df.iterrows():
        company_data.append({
            'fecha': row['fecha'].strftime('%Y-%m-%d'),
            'produccion_final': int(row['Producción final']),
            'tasa_defectos': float(row['Tasa de productos defectuosos']),
            'tiempo_reparacion_promedio': float(row['Tiempo promedio de reparación']),
            'ocupacion_suministro': float(row['Ocupación dispositivo de suministro']),
            'retraso_promedio': float(row['Retraso promedio por cuellos de botella'])
        })
    
    workstation_data = []
    for index, row in df.iterrows():
        date_str = row['fecha'].strftime('%Y-%m-%d')
        
        for station_id in range(6):
            workstation_data.append({
                'fecha': date_str,
                'estacion_id': station_id,
                'ocupacion': float(row[f'Ocupación Est. {station_id}']),
                'inactividad': float(row[f'Inactividad Est. {station_id}']) / 5000,
                'fallos': 0
            })
    
    df['fecha'] = pd.to_datetime(df['fecha'])
    
    daily_data = company_data
    
    df['semana'] = df['fecha'].dt.isocalendar().week
    weekly_data = aggregate_by_period(df, 'semana')
    
    df['mes'] = df['fecha'].dt.month
    monthly_data = aggregate_by_period(df, 'mes')
    
    df['trimestre'] = df['fecha'].dt.quarter
    quarterly_data = aggregate_by_period(df, 'trimestre')
    
    df['año'] = df['fecha'].dt.year
    yearly_data = aggregate_by_period(df, 'año')
    
    bottleneck_data = analyze_bottlenecks(df)
    
    data = {
        'company': company_data,
        'workstation': workstation_data,
        'time_periods': {
            'daily': daily_data,
            'weekly': weekly_data,
            'monthly': monthly_data,
            'quarterly': quarterly_data,
            'yearly': yearly_data
        },
        'bottlenecks': bottleneck_data
    }
    
    os.makedirs('dashboard/data', exist_ok=True)
    
    with open('dashboard/data/dashboard_data.json', 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2, cls=NumpyEncoder)
    
    print(f"Datos procesados y guardados en dashboard/data/dashboard_data.json")
    return data

def aggregate_by_period(df, period_col):
    agg_data = []
    period_groups = df.groupby(period_col)
    
    for period, group in period_groups:
        agg_data.append({
            'periodo': int(period),
            'produccion_total': int(group['Producción final'].sum()),
            'produccion_promedio': float(group['Producción final'].mean()),
            'tasa_defectos_promedio': float(group['Tasa de productos defectuosos'].mean()),
            'tiempo_reparacion_promedio': float(group['Tiempo promedio de reparación'].mean()),
            'ocupacion_suministro_promedio': float(group['Ocupación dispositivo de suministro'].mean())
        })
    
    return agg_data

def analyze_bottlenecks(df):
    bottlenecks = []
    
    station_occupancy = {}
    for station_id in range(6):
        col_name = f'Ocupación Est. {station_id}'
        station_occupancy[station_id] = df[col_name].mean()
    
    sorted_stations = sorted(station_occupancy.items(), key=lambda x: x[1], reverse=True)
    
    for station_id, occupancy in sorted_stations:
        inactivity_col = f'Inactividad Est. {station_id}'
        bottlenecks.append({
            'estacion_id': station_id,
            'ocupacion_promedio': float(occupancy),
            'inactividad_promedio': float(df[inactivity_col].mean()) / 5000,
            'posible_cuello_botella': bool(occupancy > 0.7)
        })
    
    return bottlenecks

if __name__ == "__main__":
    os.makedirs('dashboard/data', exist_ok=True)
    
    process_simulation_data()