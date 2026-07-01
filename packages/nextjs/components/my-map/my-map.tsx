import L from "leaflet";
import { AttributionControl, MapContainer, Marker, TileLayer } from "react-leaflet";

interface MyMapProps {
  person1Name?: string;
  person2Name?: string;
  position1: [number, number];
  position2?: [number, number];
}

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

const initialsForName = (name: string) => {
  const parts = name
    .replace(/[^a-zA-Z0-9 ]/g, "")
    .split(" ")
    .filter(Boolean);

  if (parts.length === 0) return "Y";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();

  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
};

const avatarIcon = (name: string, variant: "self" | "peer") => {
  const safeName = escapeHtml(name);
  const safeInitials = escapeHtml(initialsForName(name));

  return L.divIcon({
    className: "yenshia-map-avatar-icon",
    html: `
      <div class="map-avatar-marker map-avatar-marker--${variant}">
        <span class="map-avatar-initials">${safeInitials}</span>
        <span class="map-avatar-name">${safeName}</span>
      </div>
    `,
    iconAnchor: [24, 48],
    iconSize: [120, 54],
  });
};

const MyMap = ({ person1Name = "You", person2Name = "Other person", position1, position2 }: MyMapProps) => {
  const isRealPosition = (position?: [number, number]): position is [number, number] =>
    !!position &&
    !(position[0] === 0 && position[1] === 0) &&
    Number.isFinite(position[0]) &&
    Number.isFinite(position[1]);

  if (!isRealPosition(position1)) return null;

  return (
    <MapContainer
      attributionControl={false}
      center={position1}
      zoom={17}
      className="z-10 h-[min(68dvh,34rem)] min-h-[21rem] w-full rounded-2xl"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <AttributionControl prefix={false} position="bottomright" />
      <Marker position={position1} icon={avatarIcon(person1Name, "self")} />
      {isRealPosition(position2) && <Marker position={position2} icon={avatarIcon(person2Name, "peer")} />}
    </MapContainer>
  );
};

export default MyMap;
