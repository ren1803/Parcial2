import os
import subprocess
import sys
import shutil
import webbrowser
from http.server import HTTPServer, SimpleHTTPRequestHandler

def verificar_dependencias():
    """Verifica que estén instaladas todas las dependencias necesarias"""
    dependencias_requeridas = ["simpy", "random", "openpyxl", "pandas"]
    dependencias_faltantes = []
    
    for dependencia in dependencias_requeridas:
        try:
            __import__(dependencia)
        except ImportError:
            dependencias_faltantes.append(dependencia)
    
    if dependencias_faltantes:
        print(f"Faltan las siguientes dependencias: {', '.join(dependencias_faltantes)}")
        instalar = input("¿Desea instalarlas ahora? (s/n): ")
        if instalar.lower() == 's':
            for dependencia in dependencias_faltantes:
                subprocess.check_call([sys.executable, "-m", "pip", "install", dependencia])
            print("Dependencias instaladas correctamente.")
        else:
            print("Debe instalar las dependencias antes de continuar.")
            sys.exit(1)

def crear_estructura_proyecto():
    """Crea la estructura de directorios del proyecto si no existe"""
    directorios = [
        "simulation",
        "data",
        "dashboard",
        "dashboard/css",
        "dashboard/js",
        "dashboard/data",
        "dashboard/assets"
    ]
    
    for directorio in directorios:
        os.makedirs(directorio, exist_ok=True)
    
    
    if os.path.exists("Simulation.py") and not os.path.exists("simulation/simulation.py"):
        shutil.copy("Simulation.py", "simulation/simulation.py")

def ejecutar_simulacion():
    """Ejecuta la simulación para generar los datos"""
    print("Ejecutando simulación...")
    os.chdir("simulation")
    subprocess.check_call([sys.executable, "simulation.py"])
    os.chdir("..")
    
    
    if os.path.exists("simulation/resultados.xlsx") and not os.path.exists("data/resultados.xlsx"):
        shutil.copy("simulation/resultados.xlsx", "data/resultados.xlsx")
    elif os.path.exists("resultados.xlsx") and not os.path.exists("data/resultados.xlsx"):
        shutil.copy("resultados.xlsx", "data/resultados.xlsx")

def procesar_datos():
    """Procesa los datos generados por la simulación para el dashboard"""
    print("Procesando datos para el dashboard...")
    subprocess.check_call([sys.executable, "data_processor.py"])

def iniciar_servidor():
    """Inicia un servidor HTTP local para visualizar el dashboard"""
    print("Iniciando servidor en http://localhost:8000")
    os.chdir("dashboard")
    
    
    webbrowser.open("http://localhost:8000")
    
    
    server_address = ('', 8000)
    httpd = HTTPServer(server_address, SimpleHTTPRequestHandler)
    print("Servidor iniciado. Presione Ctrl+C para detener.")
    httpd.serve_forever()

def main():
    print("=== Configuración del Dashboard de Planta Manufacturera ===")
    
    
    verificar_dependencias()
    
    
    crear_estructura_proyecto()
    
    
    ejecutar_sim = input("¿Desea ejecutar la simulación para generar nuevos datos? (s/n): ")
    if ejecutar_sim.lower() == 's':
        ejecutar_simulacion()
    
    
    procesar_datos()
    
    
    iniciar_servidor()

if __name__ == "__main__":
    main()