
export type Client = {
  id: string;
  name: string;
  tradeName: string;
  ruc: string;
  contact: string;
  email: string;
  phone: string;
  location: string;
  address: string;
  assets: number;
  notes: string;
};

export const mockClients: Client[] = [
  {
    id: "CLI-001",
    name: "Constructora El Roble S.A.C.",
    tradeName: "El Roble",
    ruc: "20601234567",
    contact: "Carlos Mendoza",
    email: "contacto@elroble.pe",
    phone: "987 654 321",
    location: "Miraflores, Lima",
    address: "Av. José Larco 450",
    assets: 20,
    notes: "Cliente de ejemplo para el desarrollo del sistema.",
  },
  {
    id: "CLI-002",
    name: "Inmobiliaria Los Álamos S.A.C.",
    tradeName: "Los Álamos",
    ruc: "20602345678",
    contact: "María Fernández",
    email: "administracion@losalamos.pe",
    phone: "986 123 456",
    location: "San Isidro, Lima",
    address: "Av. República de Colombia 320",
    assets: 35,
    notes: "",
  },
  {
    id: "CLI-003",
    name: "Grupo Empresarial Andino S.A.C.",
    tradeName: "Grupo Andino",
    ruc: "20603456789",
    contact: "Jorge Ramírez",
    email: "contacto@grupoandino.pe",
    phone: "985 456 789",
    location: "Santiago de Surco, Lima",
    address: "Av. Primavera 180",
    assets: 48,
    notes: "",
  },
  {
    id: "CLI-004",
    name: "Edificaciones del Pacífico S.A.C.",
    tradeName: "Edificaciones del Pacífico",
    ruc: "20604567891",
    contact: "Lucía Torres",
    email: "proyectos@edificaciones.pe",
    phone: "984 321 654",
    location: "San Borja, Lima",
    address: "Av. San Luis 650",
    assets: 0,
    notes: "",
  },
  {
    id: "CLI-005",
    name: "Servicios Integrales del Sur E.I.R.L.",
    tradeName: "Integrales del Sur",
    ruc: "20605678912",
    contact: "Pedro Castillo",
    email: "servicios@integrales.pe",
    phone: "983 654 123",
    location: "La Molina, Lima",
    address: "Av. La Molina 800",
    assets: 12,
    notes: "",
  },
];
