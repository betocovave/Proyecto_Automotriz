# Análisis de Productividad en Talleres Automotrices

Este directorio contiene un análisis de productividad de talleres automotrices, con especial énfasis en talleres Volkswagen, utilizando técnicas de aprendizaje automático y análisis de datos.

## Estructura de archivos

- **dataset_talleres.csv**: Dataset original con información básica sobre talleres automotrices.
- **dataset_talleres_mejorado.csv**: Dataset ampliado con variables adicionales para un análisis más profundo.
- **regresion_talleres.py**: Script básico para realizar una regresión lineal.
- **regresion_talleres_avanzado.py**: Script avanzado que aplica múltiples modelos y técnicas de aprendizaje automático.
- **mostrar_graficos.py**: Utilidad para visualizar los gráficos generados.
- **generar_reporte_html.py**: Genera un reporte HTML con los resultados del análisis básico.
- **/graficos**: Carpeta donde se guardan todas las visualizaciones generadas por los scripts.

## Características del dataset mejorado

El dataset mejorado incluye las siguientes variables:

- **Citas_Diarias**: Número promedio de citas diarias en el taller
- **Mecanicos_Disponibles**: Cantidad de mecánicos disponibles
- **Tiempo_Promedio_Reparacion**: Tiempo promedio para completar una reparación (horas)
- **Satisfaccion_Cliente**: Índice de satisfacción del cliente (1-10)
- **Tipo_Taller**: Categoría del taller (Premium VW, Concesionario, Concesionario VW, Independiente)
- **Reparaciones_Realizadas**: Número de reparaciones completadas (variable objetivo)
- **KPI_Eficiencia**: Índice de eficiencia del taller (0-1)
- **Ingresos_Promedio**: Ingresos promedio por reparación (unidades monetarias)
- **Antigüedad_Promedio_Vehiculos**: Edad promedio de los vehículos atendidos (años)
- **Capacitacion_Tecnicos**: Nivel de capacitación de los técnicos (0-100)
- **Piezas_Disponibles_Ratio**: Ratio de disponibilidad de piezas necesarias (0-1)

## Modelos implementados

El script avanzado implementa y compara los siguientes modelos:

1. **Regresión Lineal**: Modelo básico de regresión
2. **Ridge**: Regresión con regularización L2
3. **Lasso**: Regresión con regularización L1
4. **Random Forest**: Modelo de conjunto basado en árboles de decisión

## Cómo ejecutar los scripts

### Análisis básico
```bash
python regresion_talleres.py
```

### Análisis avanzado
```bash
python regresion_talleres_avanzado.py
```

### Generar reporte HTML
```bash
python generar_reporte_html.py
```

### Visualizar gráficos guardados
```bash
python mostrar_graficos.py
```

## Resultados

El análisis avanzado genera múltiples visualizaciones que muestran:

1. Distribución de reparaciones por tipo de taller
2. Relación entre eficiencia y reparaciones realizadas
3. Matriz de correlación entre variables
4. Comparación de modelos predictivos
5. Importancia de las características para la predicción
6. Análisis específico para talleres Volkswagen
7. Comparativa entre talleres Volkswagen y talleres independientes
8. Relación entre antigüedad de vehículos y tiempo de reparación

## Conclusiones principales

- Los talleres Premium VW muestran mayor eficiencia y productividad en comparación con los talleres independientes.
- El nivel de capacitación de los técnicos y la disponibilidad de piezas son factores críticos para la productividad.
- Los talleres con mayor ratio de disponibilidad de piezas pueden completar más reparaciones.
- La antigüedad de los vehículos tiene una correlación directa con el tiempo necesario para las reparaciones.
- Los modelos de aprendizaje automático permiten predecir con buena precisión el número de reparaciones que puede realizar un taller.

## Notas

Los datos utilizados combinan información real y sintética para fines de análisis y demostración. 