import MarkerIcon from "./marker.svg";
import L from "leaflet";
import { MapContainer, Marker, TileLayer } from "react-leaflet";

interface MyMapProps {
  position1: [number, number];
  position2: [number, number];
}

const otherPersonIcon = new L.Icon({
  iconUrl: MarkerIcon.src,
  iconRetinaUrl: MarkerIcon.src,
  iconSize: new L.Point(30, 30),
  className: "leaflet-div-icon rounded-full",
});

const currentPersonIcon = new L.Icon({
  iconUrl: MarkerIcon.src,
  iconRetinaUrl: MarkerIcon.src,
  iconSize: new L.Point(30, 30),
  className: "leaflet-div-icon rounded-full",
});

const MyMap = ({ position1, position2 }: MyMapProps) => {
  if ((position1[0] === 0 && position1[1] === 0) || (position2[0] === 0 && position2[1] === 0)) return null;

  return (
    <MapContainer center={position1} zoom={17} className="z-10 h-[min(56vh,26rem)] w-full rounded-3xl">
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <Marker position={position1} icon={currentPersonIcon} />
      <Marker position={position2} icon={otherPersonIcon} />
    </MapContainer>
  );
};

export default MyMap;
