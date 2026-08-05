import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { MapContainer, Marker, Popup, TileLayer } from "react-leaflet";
import L from "leaflet";
import { BRAND } from "../../config/brand";
import { listProjects } from "../../api/projects";
import ScoreCard from "../../components/ScoreCard";

const markerColors = {
  planned: "#0176d3",
  in_progress: "#b78103",
  completed: "#2e7d32",
  disputed: "#ea001e",
};

function statusIcon(status) {
  return L.divIcon({
    className: "",
    html: `<div style="width:16px;height:16px;border-radius:999px;border:3px solid white;background:${markerColors[status] || markerColors.planned};box-shadow:0 8px 24px rgba(0,0,0,.2)"></div>`,
    iconSize: [22, 22],
    iconAnchor: [11, 11],
  });
}

export default function MapPortal() {
  const [projects, setProjects] = useState([]);
  const [filters, setFilters] = useState({ city: "", ward: "", category: "" });
  const navigate = useNavigate();

  useEffect(() => {
    let mounted = true;
    listProjects(filters).then((response) => {
      if (mounted) setProjects(response.data || []);
    });
    return () => {
      mounted = false;
    };
  }, [filters.city, filters.ward, filters.category]);

  const center = useMemo(() => {
    const first = projects[0]?.location?.coordinates;
    return first ? [first[1], first[0]] : [23.22, 77.43];
  }, [projects]);

  return (
    <div className="fw-container py-6 md:py-10">
      <section className="slds-page-shell overflow-hidden">
        <div className="grid gap-0 lg:grid-cols-[1fr_360px]">
          <div className="relative min-h-[560px]">
            <div className="absolute left-6 top-6 z-10 max-w-xl rounded-[4px] border border-[#c9c9c9] bg-white p-5 shadow-[0_2px_2px_rgba(0,0,0,0.1)]">
              <div className="flex items-center gap-3">
                <img src={BRAND.logoLandscape} alt={BRAND.name} className="h-12 w-auto rounded-[4px]" />
                <div>
                  <h1 className="slds-page-title">Live civic projects</h1>
                  <p className="slds-page-subtitle mt-1">Explore public works, verify progress, and follow every version.</p>
                </div>
              </div>
            </div>
            <MapContainer center={center} zoom={12} className="h-[560px] w-full">
              <TileLayer attribution="&copy; OpenStreetMap contributors" url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
              {projects.map((project) => {
                const coords = project.location?.coordinates;
                if (!coords) return null;
                return (
                  <Marker key={project.id} position={[coords[1], coords[0]]} icon={statusIcon(project.status)}>
                    <Popup>
                      <div className="space-y-2 text-sm">
                        <div className="font-semibold text-[#181818]">{project.title}</div>
                        <div>{project.ward} - {project.category}</div>
                        <Link className="text-[#0176d3] underline" to={`/projects/${project.id}`}>View project</Link>
                      </div>
                    </Popup>
                  </Marker>
                );
              })}
            </MapContainer>
          </div>

          <aside className="border-t border-[#c9c9c9] bg-[#fafaf9] p-5 lg:border-l lg:border-t-0">
            <div className="space-y-4">
              <div className="rounded-[4px] border border-[#c9c9c9] bg-white p-4 shadow-[0_2px_2px_rgba(0,0,0,0.1)]">
                <h2 className="text-lg font-semibold text-[#181818]">Filters</h2>
                <div className="mt-3 space-y-3">
                  <input
                    placeholder="City"
                    value={filters.city}
                    onChange={(e) => setFilters({ ...filters, city: e.target.value })}
                    className="w-full rounded-[4px] border border-[#aeaeae] bg-white px-4 py-3 outline-none"
                  />
                  <input
                    placeholder="Ward"
                    value={filters.ward}
                    onChange={(e) => setFilters({ ...filters, ward: e.target.value })}
                    className="w-full rounded-[4px] border border-[#aeaeae] bg-white px-4 py-3 outline-none"
                  />
                  <select
                    value={filters.category}
                    onChange={(e) => setFilters({ ...filters, category: e.target.value })}
                    className="w-full rounded-[4px] border border-[#aeaeae] bg-white px-4 py-3 outline-none"
                  >
                    <option value="">All categories</option>
                    <option value="road">Road</option>
                    <option value="drain">Drain</option>
                    <option value="streetlight">Streetlight</option>
                    <option value="sanitation">Sanitation</option>
                    <option value="water_supply">Water supply</option>
                  </select>
                </div>
              </div>

              <ScoreCard score={projects[0]?.current_civic_score?.score ?? 0} label="Featured project score" />

              <div className="rounded-[4px] border border-[#c9c9c9] bg-white p-4 shadow-[0_2px_2px_rgba(0,0,0,0.1)]">
                <h3 className="text-lg font-semibold text-[#181818]">Recent projects</h3>
                <div className="mt-3 space-y-3">
                  {projects.slice(0, 5).map((project) => (
                    <button
                      key={project.id}
                      onClick={() => navigate(`/projects/${project.id}`)}
                      className="block w-full rounded-[4px] border border-[#c9c9c9] bg-white px-4 py-3 text-left hover:bg-[#eef4ff]"
                    >
                      <div className="font-medium text-[#181818]">{project.title}</div>
                      <div className="text-xs text-[#747474]">{project.ward} - {project.status}</div>
                    </button>
                  ))}
                  {!projects.length && <p className="text-sm text-[#747474]">No projects match these filters yet.</p>}
                </div>
              </div>
            </div>
          </aside>
        </div>
      </section>
    </div>
  );
}
