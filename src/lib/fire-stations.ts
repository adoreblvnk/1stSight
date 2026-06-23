// opencode run "$(cat /tmp/1stsight-opencode-map-feature.md)"
import type { Coordinates, DeploymentMarker, Incident } from "@/lib/domain";

export type FireStation = {
  id: string;
  name: string;
  address: string;
  position: Coordinates;
};

// OneMap Search API: https://www.onemap.gov.sg/apidocs/apidocs/#search
export const fireStations: FireStation[] = [
  { id: "alexandra-fire-station", name: "Alexandra Fire Station", address: "3 Queensway Singapore 149073", position: { lat: 1.28842658, lng: 103.80282953 } },
  { id: "ang-mo-kio-fire-station", name: "Ang Mo Kio Fire Station", address: "2874 Ang Mo Kio Avenue 9 Singapore 569783", position: { lat: 1.38498785, lng: 103.84562732 } },
  { id: "banyan-fire-station", name: "Banyan Fire Station", address: "15 Banyan Road Singapore 627642", position: { lat: 1.25413515, lng: 103.6740546 } },
  { id: "bishan-fire-station", name: "Bishan Fire Station", address: "1 Marymount Lane Singapore 574029", position: { lat: 1.34828074, lng: 103.83855936 } },
  { id: "brani-marine-fire-station", name: "Brani Marine Fire Station", address: "19 Brani Way Singapore 098002", position: { lat: 1.25683952, lng: 103.83913526 } },
  { id: "bukit-batok-fire-station", name: "Bukit Batok Fire Station", address: "80 Bukit Batok Road Singapore 658072", position: { lat: 1.37339949, lng: 103.75285747 } },
  { id: "central-fire-station", name: "Central Fire Station", address: "62 Hill Street Singapore 179367", position: { lat: 1.29204516, lng: 103.84915407 } },
  { id: "changi-fire-station", name: "Changi Fire Station", address: "491 Upper Changi Road Singapore 486965", position: { lat: 1.33487955, lng: 103.95135328 } },
  { id: "clementi-fire-station", name: "Clementi Fire Station", address: "Commonwealth Avenue West Singapore 129577", position: { lat: 1.32188264, lng: 103.76166706 } },
  { id: "jurong-fire-station", name: "Jurong Fire Station", address: "22 Jurong West Street 26 Singapore 648126", position: { lat: 1.34787824, lng: 103.70528782 } },
  { id: "jurong-island-fire-station", name: "Jurong Island Fire Station", address: "70 Jurong Island Highway Singapore 627880", position: { lat: 1.2719405, lng: 103.70821013 } },
  { id: "kallang-fire-station", name: "Kallang Fire Station", address: "2 Guillemard Close Singapore 397623", position: { lat: 1.30936454, lng: 103.87924498 } },
  { id: "marina-bay-fire-station", name: "Marina Bay Fire Station", address: "70 Marina View Singapore 018962", position: { lat: 1.27486188, lng: 103.84909434 } },
  { id: "paya-lebar-fire-station", name: "Paya Lebar Fire Station", address: "91 Ubi Avenue 4 Singapore 408827", position: { lat: 1.33416462, lng: 103.89368759 } },
  { id: "punggol-fire-station", name: "Punggol Fire Station", address: "151 Punggol Central Singapore 828727", position: { lat: 1.39770676, lng: 103.91410458 } },
  { id: "sengkang-fire-station", name: "Sengkang Fire Station", address: "50 Buangkok Drive Singapore 545064", position: { lat: 1.3802953, lng: 103.89544538 } },
  { id: "sentosa-fire-station", name: "Sentosa Fire Station", address: "37 Artillery Avenue Singapore 099957", position: { lat: 1.25070706, lng: 103.82751166 } },
  { id: "tampines-fire-station", name: "Tampines Fire Station", address: "1 Tampines Industrial Avenue 3 Singapore 528777", position: { lat: 1.35804811, lng: 103.92945425 } },
  { id: "tuas-fire-station", name: "Tuas Fire Station", address: "7 Tuas Road Singapore 638483", position: { lat: 1.31966262, lng: 103.66131836 } },
  { id: "tuas-view-fire-station", name: "Tuas View Fire Station", address: "130 Tuas South Avenue 3 Singapore 637367", position: { lat: 1.28898313, lng: 103.62751613 } },
  { id: "west-coast-marine-fire-station", name: "West Coast Marine Fire Station", address: "60 West Coast Ferry Road Singapore 126979", position: { lat: 1.29250761, lng: 103.76206169 } },
  { id: "west-satellite-fire-station", name: "West Satellite Fire Station", address: "77 Airport Cargo Road Singapore 819481", position: { lat: 1.37135081, lng: 103.99170479 } },
  { id: "woodlands-fire-station", name: "Woodlands Fire Station", address: "1 Woodlands Industrial Park D Street 2 Singapore 738782", position: { lat: 1.43078795, lng: 103.76236187 } },
  { id: "yishun-fire-station", name: "Yishun Fire Station", address: "533 Yishun Industrial Park A Singapore 768774", position: { lat: 1.44415448, lng: 103.83693428 } },
];

export const fireStationDeploymentMarkers: DeploymentMarker[] = fireStations.map((station) => ({
  id: station.id,
  label: station.name,
  kind: "station",
  position: station.position,
  status: station.address,
}));

function distanceSquared(origin: Coordinates, target: Coordinates) {
  const latDelta = origin.lat - target.lat;
  const lngDelta = origin.lng - target.lng;

  return latDelta * latDelta + lngDelta * lngDelta;
}

export function nearestFireStation(position: Coordinates) {
  return fireStations.reduce((nearest, station) => (distanceSquared(station.position, position) < distanceSquared(nearest.position, position) ? station : nearest), fireStations[0]);
}

export function dispatchVehicleLabel(incident: Incident) {
  return incident.type === "medical" ? "Ambulance dispatch" : "Firetruck dispatch";
}

export function dispatchVehicleStatus(incident: Incident, progress: number) {
  const unit = incident.type === "medical" ? "ambulance" : "firetruck";
  if (progress >= 1) return `${unit} arrived`;
  if (progress > 0) return `${unit} moving`;
  return `${unit} assigned`;
}
