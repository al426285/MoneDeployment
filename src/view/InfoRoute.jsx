import React, { useState, useEffect } from "react";
import LeafletMap from "./components/LeafletMap.jsx";
import "../../styles/styles.css";
import polyline from "@mapbox/polyline";
import { VehicleViewModel } from "../viewmodel/VehicleViewModel.ts";
//para decodificar la respuesta de open route service la cual viene en formato polyline puntos para trazar la ruta



const vehicleOptions = [
    { id: "vehicle", label: "Vehicle", icon: "M3 14h1.2l1.2-3.6h9l1.2 3.6h1.4a1.2 1.2 0 0 1 0 2.4h-.6a1.6 1.6 0 0 1-3.2 0H7.2a1.6 1.6 0 0 1-3.2 0H3a1.2 1.2 0 0 1 0-2.4zM7 17.2a1.4 1.4 0 1 0 0 .01zm8 0a1.4 1.4 0 1 0 0 .01z" },
    { id: "bicycle", label: "Bicycle", icon: "M6 17a3 3 0 1 1 0-6 3 3 0 0 1 0 6zm9 0a3 3 0 1 1 0-6 3 3 0 0 1 0 6zm-7.5-5.5 1.6-3.5H11l1 3h2l1.4 2.5" },
    { id: "walking", label: "Walking", icon: "M11 4a2 2 0 1 1 0 4 2 2 0 0 1 0-4zm-2 6.5L7 21h2l1.2-4.8 2 2.3V21h2v-5.2l-1.8-1.8.6-2.6 2 1.2L16 9l-3.4-2z" },
];
const ORIGIN = {
    label: "Polideportivo",
    city: "Burriana",
    coords: [-0.093, 39.889],
};

const DESTINATION = {
    label: "Centro Ciudad",
    city: "Castellón",
    coords: [-0.05, 39.9833],
};


export function InfoRoute() {

    const {
        vehicles,
        loading,
        error,
        loadVehicles,
        addVehicle,
        deleteVehicle,
    } = VehicleViewModel();


    const [summaryData, setSummaryData] = useState([
        { label: "Distance", value: "-" },
        { label: "Duration", value: "-" },
        { label: "Route Type", value: "-" },
        { label: "Est. Cost", value: "-" },
    ]);


    const [routePolyline, setRoutePolyline] = useState([]);
    const [distance, setDistance] = useState(0);
    const [duration, setDuration] = useState(0);
    const [consumption, setConsumption] = useState(0);

    //Latitud (lat) → valor entre -90 y 90 → indica norte-sur
    //Longitud (lon) → valor entre -180 y 180 → indica este-oeste
    const origin = ORIGIN;

    const destination = DESTINATION;

    const profileByVehicle = {
        vehicle: "driving-car",
        bicycle: "cycling-regular",
        walking: "foot-walking",
    };

    //metodo de movilidad seleccionado (vehiculo, bicicleta, caminando)
    const [selectedVehicle, setSelectedVehicle] = useState(null);

    //vehiculo seleccionado en el desplegable de vehiculos guardados
    const [selectedVehicleId, setSelectedVehicleId] = useState(null);

    // metodo de movilidad segun el vehiculo seleccionado
    const profile = profileByVehicle[selectedVehicle] ?? "driving-car";


    const markers = [origin.coords, destination.coords];

    const [shouldCalculate, setShouldCalculate] = useState(false);

    //mostrar solo los vehiculos que coincidan con el metodo de movilidad seleccionado
    const transportTypeMap = {
        vehicle: ["FuelCar", "ElectricCar"],
        bicycle: ["Bike"],
        walking: ["Walking"],
    };

    const filteredVehicles =
        selectedVehicle && transportTypeMap[selectedVehicle] //solo filtra si hay un metodo de movilidad seleccionado y ese existe en el mapa transportTypeMap
            ? vehicles.filter(v =>
                transportTypeMap[selectedVehicle].includes(v.type)
            )
            : [];

 

//IMPORTANTISIMO: si solo hay un vehiculo en el filtro, seleccionarlo automaticamente, ya que si no el usuario tendria que seleccionarlo manualmente siempre y tampoco es que funcine bien la seleccion del vehiculo
    useEffect(() => {
        if (filteredVehicles.length === 1) {
            setSelectedVehicleId(filteredVehicles[0].name);
        }
        console.log("Filtered vehicles updated:", selectedVehicleId);
        console.log("Filtered vehicles list:", filteredVehicles);
    }, [filteredVehicles]);

       //VEHICULO SELECCIONADO
    const selectedVehicleData = vehicles.find(v => v.name === selectedVehicleId);

    useEffect(() => {
        //if (!shouldCalculate) return; // ⛔ no hace nada hasta pulsar el botón

        const abort = new AbortController();

        async function fetchRoute() {


            try {
                const res = await fetch(`/ors/v2/directions/${profile}`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        coordinates: [
                            [origin.coords[0], origin.coords[1]], // lon, lat
                            [destination.coords[0], destination.coords[1]],
                        ],
                    }),
                });

                if (!res.ok) {
                    const error = await res.json();
                    console.error("ORS error:", error);
                    return;
                }

                const data = await res.json();
                const route = data.routes[0];
                const decoded = polyline.decode(route.geometry);

                setRoutePolyline(decoded);
                setDistance(route.summary.distance);
                setDuration(route.summary.duration);
                console.log("Route profile:", profile);
                console.log("Route distance (m):", distance);
                console.log("Route duration (s):", duration);

                let estimatedCost = "-";

                console.log("EOOOOOOOOOOOOOOO:", selectedVehicleData);
                if (selectedVehicleData?.type === "FuelCar") {
                    const km = distance / 1000;
                    const liters = (km * selectedVehicleData.consumption.amount.amount) / 100;
                    const fuelPrice = 1.5; // €/L
                    estimatedCost = `${(liters * fuelPrice).toFixed(2)} €`;
                }

                if (selectedVehicleData?.type === "ElectricCar") {
                    const km = distance / 1000;
                    const kWh = (km * selectedVehicleData.consumption.amount.amount) / 100;
                    const pricePerKwh = 0.25;
                    estimatedCost = `${(kWh * pricePerKwh).toFixed(2)} €`;
                }

                if (["Walking", "Bike"].includes(selectedVehicleData?.type)) {
                    const km = distance / 1000;
                    const caloriesPerKm = selectedVehicleData.consumption.amount.amount; // kcal/km
                    const totalCalories = route.summary.duration/60 * caloriesPerKm;
                    estimatedCost = `${totalCalories.toFixed(0)} kcal`;
                }
                console.log("Estimated Cost:", estimatedCost);

                setSummaryData([
                    { label: "Distance", value: `${(route.summary.distance / 1000).toFixed(1)} km` },
                    { label: "Duration", value: `${Math.round(route.summary.duration / 60)} min` },
                    //  { label: "Route Type", value: "Fastest" }, // o calculado si tienes otra lógica
                    { label: "Est. Cost", value: estimatedCost }, // ejemplo aproximado
                ]);



                const coords = data.features[0].geometry.coordinates;

                // ORS → [lon, lat] | Leaflet → [lat, lon]
                //setRoutePolyline(coords.map(([lon, lat]) => [lat, lon]));
                //setSummary(data.features[0].properties.summary);
            } catch (e) {
                console.error(e);
            }
        }

        fetchRoute();
        console.log("Calculating route... with profile:", profile);
        console.log("Vehicles available:", vehicles);
        console.log("Selected vehicles:", filteredVehicles);
        console.log("Vehicle selected", selectedVehicleId);


        //  fetchRoute();//se llama a la funcion cada vez que cambian las coordenadas de origen o destino o el metodo de movilidad
        setShouldCalculate(false);
        return () => abort.abort();
    }, [origin, destination, selectedVehicle, selectedVehicleId]);

    return (
        <div className="route-info-layout">
            <div className="route-info-actions">
                <button
                    type="button"
                    className="route-info-save"
                    onClick={() => setShouldCalculate(true)}
                >
                    Calcular ruta
                </button>
            </div>
            <section className="route-info-content">
                <article className="route-info-map-card">
                    <div className="route-info-card-header">
                        <div>
                            <p className="route-info-eyebrow">Route Details</p>
                            <h2>From {origin.label} ({origin.city}) to {destination.label}  ({destination.city})</h2>
                        </div>
                        <span className="route-info-chip">Live</span>
                    </div>
                    <div className="route-info-map" aria-label="Route preview on interactive map">
                        <div className="route-info-map-overlay">
                            <p>{origin.label} → {destination.label}</p>
                            <span>{origin.coords[0].toFixed(3)}, {origin.coords[1].toFixed(3)} · {destination.coords[0].toFixed(3)}, {destination.coords[1].toFixed(3)}</span>
                        </div>
                        <LeafletMap
                            // Leaflet espera [lat, lon], mucho ojo
                            center={[origin.coords[1], origin.coords[0]]}
                            markers={markers.map(([lat, lon]) => [lon, lat])}
                            polyline={routePolyline}
                            autoFitBounds
                            polylineOptions={{ color: "#585233", weight: 5, opacity: 0.85 }}
                            style={{ minHeight: 360 }}
                        />
                    </div>
                    <div className="route-info-actions">
                        <button type="button" className="route-info-save">+ Save Route</button>
                    </div>
                </article>

                <aside className="summary-card">
                    <header>
                        <h3>Summary</h3>
                    </header>
                    <dl>
                        {summaryData.map((item) => (
                            <div key={item.label} className="summary-row">
                                <dt>{item.label}</dt>
                                <dd>{item.value}</dd>
                            </div>
                        ))}
                    </dl>
                    <p className="summary-note">
                        This route considers current traffic. The estimated cost is based on average fuel efficiency. Actual costs may vary.
                    </p>

                    <section className="vehicle-selector" aria-label="Select the vehicle">
                        <p className="vehicle-selector__title">Select the vehicle</p>
                        <div className="vehicle-selector__options">
                            {vehicleOptions.map((option, idx) => (
                                <button
                                    key={option.id}
                                    type="button"
                                    className={`vehicle-selector__option ${selectedVehicle === option.id ? "active" : ""}`}
                                    aria-pressed={selectedVehicle === option.id}
                                    onClick={() => setSelectedVehicle(option.id)}
                                >
                                    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                                        <path d={option.icon} fill="currentColor" />
                                    </svg>
                                    <span>{option.label}</span>
                                </button>
                            ))}
                        </div>
                        <div className="vehicle-selector__dropdown">
                            <label htmlFor="vehicle-select" className="sr-only">Select saved vehicle</label>
                            <select
                                id="vehicle-select"
                                value={selectedVehicleId ?? ""}
                                onChange={(e) => setSelectedVehicleId(e.target.value)}
                            >
                                {filteredVehicles.map(v => (
                                    <option key={v.id} value={v.id}>{v.name}</option>
                                ))}
                            </select>
                        </div>
                    </section>
                </aside>
            </section>
        </div>
    );
}
export default InfoRoute;