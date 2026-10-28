
import departamentosData from "../data/ubigeo/departamentos.json";
import provinciasData from "../data/ubigeo/provincias.json";
import distritosData from "../data/ubigeo/distritos.json";

export interface Departamento {
  id: string;
  name: string;
}

export interface Provincia {
  id: string;
  name: string;
  department_id: string;
}

export interface Distrito {
  id: string;
  name: string;
  province_id: string;
  department_id: string;
}

export const departamentos = departamentosData as Departamento[];
export const provincias = provinciasData as Provincia[];
export const distritos = distritosData as Distrito[];

export function obtenerProvincias(departamentoId: string): Provincia[] {
  if (!departamentoId) return [];

  return provincias.filter(
    (provincia) => provincia.department_id === departamentoId,
  );
}

export function obtenerDistritos(
  departamentoId: string,
  provinciaId: string,
): Distrito[] {
  if (!departamentoId || !provinciaId) return [];

  return distritos.filter(
    (distrito) =>
      distrito.department_id === departamentoId &&
      distrito.province_id === provinciaId,
  );
}

export function obtenerDepartamentoPorId(
  id: string,
): Departamento | undefined {
  return departamentos.find((departamento) => departamento.id === id);
}

export function obtenerProvinciaPorId(
  id: string,
): Provincia | undefined {
  return provincias.find((provincia) => provincia.id === id);
}

export function obtenerDistritoPorId(
  id: string,
): Distrito | undefined {
  return distritos.find((distrito) => distrito.id === id);
}
