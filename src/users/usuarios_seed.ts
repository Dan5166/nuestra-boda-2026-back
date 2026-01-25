export enum EstadoUsuario {
  PENDIENTE = 'pendiente',
  CONFIRMADO = 'confirmado',
  RECHAZADO = 'rechazado',
  ERROR = 'error',
}

export enum AlergiaAlimentaria {
  NINGUNA = 'ninguna',
  VEGANA = 'vegana',
  CELIACA = 'celiaca',
  SIN_LACTOSA = 'sin lactosa',
}

export const usuariosSeed = [
    {
        nombre: "Samuel Romero",
        codigo: "GT578",
        alergiaAlimentaria: "ninguna"
    },
    {
        nombre: "Esteban Romero",
        codigo: "GT578",
        alergiaAlimentaria: "ninguna"
    },
]