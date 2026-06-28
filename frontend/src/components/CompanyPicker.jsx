import { useEffect, useState } from "react";
import { api } from "../api/client";

export default function CompanyPicker({ value, onChange }) {
  const [companies, setCompanies] = useState([]);

  useEffect(() => {
    api.listCompanies().then((data) => {
      setCompanies(data);
      if (!value && data.length) onChange(data[0].id);
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <select
      value={value || ""}
      onChange={(e) => onChange(Number(e.target.value))}
      className="border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
    >
      {companies.map((c) => (
        <option key={c.id} value={c.id}>
          {c.name}
        </option>
      ))}
    </select>
  );
}
