import { feedBuilderMessagesEn } from "./feedBuilder.en";

const firstPass = { ...feedBuilderMessagesEn, feedBuilderTitle: "Constructor del feed", feedBuilderDescription: "Inserta filas temáticas completas entre las filas normales y coloca u oculta las secciones del sistema.", feedBuilderMode: "Modo del feed", feedBuilderClassic: "Clásico", feedBuilderComposed: "Compuesto", feedBuilderRows: "filas", feedBuilderSequenceOrdered: "En orden", feedBuilderSequenceRandom: "Aleatorio", feedBuilderAddRecipe: "Añadir receta", feedBuilderRecipe: "Receta", feedBuilderRecipeName: "Nombre de la receta", feedBuilderDeleteRecipe: "Eliminar receta", feedBuilderChannels: "Canales", feedBuilderTags: "Etiquetas", feedBuilderPersonalPlaylists: "Listas personales", feedBuilderSearchSources: "Buscar fuentes…", feedBuilderNoneSelected: "Nada seleccionado", feedBuilderSelectedCount: "{count} seleccionados", feedBuilderDays: "días", feedBuilderHiddenExclude: "Excluir", feedBuilderHiddenInclude: "Permitir", feedBuilderHiddenOnly: "Solo ocultos", feedBuilderMediaInclude: "Permitir", feedBuilderMediaExclude: "Excluir", feedBuilderMediaOnly: "Solo este tipo", feedBuilderRandomOrder: "Aleatorio", feedBuilderPreview: "Comprobar disponibilidad", feedBuilderPreviewCount: "{count} candidatos", feedBuilderSaved: "Constructor del feed guardado.", feedBuilderSaveError: "No se pudo guardar el constructor del feed." };

export const feedBuilderMessagesEs = {
  ...firstPass,
  feedBuilderPreviewError: "No se pudo comprobar la disponibilidad.",
  feedBuilderLoadError: "No se pudo cargar el constructor del feed.",
  feedBuilderFeedLoadError: "No se pudo cargar el feed.",
  feedBuilderRetry: "Volver a intentarlo",
  feedBuilderClassicHint: "Mantén sin cambios el feed cronológico actual.", feedBuilderComposedHint: "Inserta filas configuradas entre las filas normales.",
  feedBuilderInterval: "Intervalo de filas temáticas", feedBuilderIntervalHint: "Se cuentan filas normales completas, no vídeos individuales.",
  feedBuilderRecipeSequence: "Orden de recetas", feedBuilderRecipeSequenceHint: "Elige recetas en el orden guardado o en un orden aleatorio estable.",
  feedBuilderSystemSectionHint: "Muestra esta sección tras el número elegido de filas normales. Usa 0 para colocarla arriba.", feedBuilderSectionVisible: "Sección visible", feedBuilderAfterRows: "Después de filas normales",
  feedBuilderRecipes: "Recetas de fila", feedBuilderRecipesHint: "Una receta aporta una fila completa. Las filas incompletas se omiten.", feedBuilderNoRecipes: "No hay filas temáticas configuradas. El feed compuesto solo tendrá filas normales y secciones del sistema visibles.",
  feedBuilderMoveUp: "Subir receta", feedBuilderMoveDown: "Bajar receta", feedBuilderRecipeEnabled: "Receta activada", feedBuilderSourceScope: "Ámbito de fuentes",
  feedBuilderAllSources: "Todas las fuentes", feedBuilderAllSourcesHint: "Usa todas las fuentes disponibles para este perfil.", feedBuilderSelectedSources: "Fuentes seleccionadas", feedBuilderSelectedSourcesHint: "Haz coincidir los canales, etiquetas o listas siguientes.",
  feedBuilderIncludeMatch: "Cómo coinciden las inclusiones", feedBuilderMatchAny: "Cualquier grupo", feedBuilderMatchAnyHint: "Un vídeo puede coincidir con cualquier grupo de fuentes no vacío.", feedBuilderMatchAll: "Todos los grupos", feedBuilderMatchAllHint: "Un vídeo debe coincidir con cada grupo de fuentes no vacío.",
  feedBuilderInclude: "Puede aparecer", feedBuilderExclude: "No debe aparecer", feedBuilderYoutubePlaylists: "Listas de YouTube seguidas", feedBuilderMaxAge: "Antigüedad máxima", feedBuilderMaxAgeHint: "Los elementos de una receta pueden tener como máximo 183 días.",
  feedBuilderHiddenTags: "Etiquetas ocultas del feed", feedBuilderShorts: "Shorts", feedBuilderLive: "En directo y próximos", feedBuilderMembersOnly: "Solo miembros", feedBuilderMediaInherit: "Seguir el ajuste del feed", feedBuilderVideoOrder: "Orden de vídeos", feedBuilderFeedOrder: "Más recientes primero",
  feedBuilderRecipeNeedsSource: "Selecciona al menos una fuente", feedBuilderRecipeNeedsSourceHint: "Esta receta permanecerá vacía hasta que selecciones un canal, etiqueta o lista.", feedBuilderConflict: "El constructor del feed cambió en otro lugar. Se cargó la versión más reciente.",
} satisfies Record<keyof typeof feedBuilderMessagesEn, string>;
