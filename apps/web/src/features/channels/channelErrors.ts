import { errorMessageFor } from '@discordia/core';

// Mensajes de error de los modales de canales y categorías, iguales en el diseño anterior y el nuevo.

export const createChannelError = (err: unknown) =>
  errorMessageFor(
    err,
    {
      400: 'Ya existe un canal con ese nombre en esta categoría.',
      403: 'No tenés permisos para crear canales en este servidor.',
      404: 'La categoría ya no existe.',
    },
    'No se pudo crear el canal.'
  );

export const editChannelError = (err: unknown) =>
  errorMessageFor(
    err,
    {
      400: 'Ya existe un canal con ese nombre en la categoría elegida.',
      403: 'No tenés permisos para editar o mover canales en este servidor.',
      404: 'La categoría elegida ya no existe.',
    },
    'No se pudieron guardar los cambios.'
  );

export const deleteChannelError = (err: unknown) =>
  errorMessageFor(err, { 403: 'No tenés permisos para eliminar canales en este servidor.' }, 'No se pudo eliminar el canal.');

export const createCategoryError = (err: unknown) =>
  errorMessageFor(
    err,
    {
      400: 'Ya existe una categoría con ese nombre.',
      403: 'No tenés permisos para crear categorías en este servidor.',
      422: 'El nombre de la categoría no es válido.',
    },
    'No se pudo crear la categoría.'
  );
