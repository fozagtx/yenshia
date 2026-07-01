import L from "leaflet";
import { useEffect } from "react";
import { AttributionControl, CircleMarker, MapContainer, Marker, TileLayer, Tooltip, useMap } from "react-leaflet";

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
  const label = variant === "self" ? "You" : "Them";

  return L.divIcon({
    className: "yenshia-map-avatar-icon",
    html: `
      <div class="map-avatar-marker map-avatar-marker--${variant}">
        <span class="map-avatar-initials" aria-hidden="true">${safeInitials}</span>
        <span class="map-avatar-copy">
          <span class="map-avatar-role">${label}</span>
          <span class="map-avatar-name">${safeName}</span>
        </span>
      </div>
    `,
    iconAnchor: variant === "self" ? [92, 66] : [24, 72],
    iconSize: [168, 72],
  });
};

const MapViewport = ({ position1, position2 }: { position1: [number, number]; position2?: [number, number] }) => {
  const map = useMap();

  useEffect(() => {
    if (position2) {
      map.fitBounds([position1, position2], {
        animate: false,
        maxZoom: 17,
        padding: [84, 84],
      });
      return;
    }

    map.setView(position1, 17, { animate: false });
  }, [map, position1, position2]);

  return null;
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
      <MapViewport position1={position1} position2={isRealPosition(position2) ? position2 : undefined} />
      <AttributionControl prefix={false} position="bottomright" />
      <CircleMarker
        center={position1}
        pathOptions={{
          color: "#0042ab",
          fillColor: "#2670dc",
          fillOpacity: 0.92,
          opacity: 1,
          weight: 4,
        }}
        radius={15}
      >
        <Tooltip direction="top" offset={[0, -16]} opacity={1} permanent>
          {person1Name}
        </Tooltip>
      </CircleMarker>
      <Marker position={position1} icon={avatarIcon(person1Name, "self")} />
      {isRealPosition(position2) && (
        <>
          <CircleMarker
            center={position2}
            pathOptions={{
              color: "#0a7f36",
              fillColor: "#0dde53",
              fillOpacity: 0.92,
              opacity: 1,
              weight: 4,
            }}
            radius={15}
          >
            <Tooltip direction="bottom" offset={[0, 18]} opacity={1} permanent>
              {person2Name}
            </Tooltip>
          </CircleMarker>
          <Marker position={position2} icon={avatarIcon(person2Name, "peer")} />
        </>
      )}
    </MapContainer>
  );
};

export default MyMap;
