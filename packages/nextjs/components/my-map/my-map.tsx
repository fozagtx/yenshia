import MarkerIcon from "./marker.svg";
import L from "leaflet";
import { MapContainer, Marker, TileLayer } from "react-leaflet";

interface MyMapProps {
  position1: [number, number];
  position2?: [number, number];
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
  const isRealPosition = (position?: [number, number]): position is [number, number] =>
    !!position &&
    !(position[0] === 0 && position[1] === 0) &&
    Number.isFinite(position[0]) &&
    Number.isFinite(position[1]);

  if (!isRealPosition(position1)) return null;

  return (
    <MapContainer
      center={position1}
      zoom={17}
      className="z-10 h-[calc(100dvh-8.5rem)] min-h-[24rem] w-full rounded-[1.75rem] sm:h-[min(68dvh,38rem)]"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <Marker position={position1} icon={currentPersonIcon} />
      {isRealPosition(position2) && <Marker position={position2} icon={otherPersonIcon} />}
    </MapContainer>
  );
};

export default MyMap;
