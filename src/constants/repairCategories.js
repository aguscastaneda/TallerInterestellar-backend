
const REPAIR_CATEGORIES = {
    MOTOR: {
        id: 'motor',
        name: 'Motor',
        icon: '🔧',
        problems: [
            { id: 'motor_no_arranca', name: 'No arranca' },
            { id: 'motor_perdida_potencia', name: 'Pérdida de potencia' },
            { id: 'motor_consumo_aceite', name: 'Consumo excesivo de aceite' },
            { id: 'motor_humo_escape', name: 'Humo en el escape' },
            { id: 'motor_ralenti_inestable', name: 'Ralentí inestable' },
            { id: 'motor_ruidos_extraños', name: 'Ruidos extraños en el motor' },
            { id: 'motor_fugas_aceite', name: 'Fugas de aceite o refrigerante' },
            { id: 'motor_otros', name: 'Otros', hasDescription: true }
        ]
    },
    SISTEMA_ELECTRICO: {
        id: 'sistema_electrico',
        name: 'Sistema eléctrico',
        icon: '⚡',
        problems: [
            { id: 'electrico_bateria_descargada', name: 'Batería descargada' },
            { id: 'electrico_alternador_dañado', name: 'Alternador dañado' },
            { id: 'electrico_luces_no_funcionan', name: 'Luces no funcionan' },
            { id: 'electrico_problemas_encendido', name: 'Problemas con el encendido' },
            { id: 'electrico_fusibles_quemados', name: 'Fusibles quemados' },
            { id: 'electrico_fallas_tablero', name: 'Fallas en el tablero o indicadores' },
            { id: 'electrico_otros', name: 'Otros', hasDescription: true }
        ]
    },
    TRANSMISION: {
        id: 'transmision',
        name: 'Transmisión',
        icon: '⚙️',
        problems: [
            { id: 'transmision_cambios_duros', name: 'Cambios duros o no entran' },
            { id: 'transmision_patina_caja', name: 'Patina la caja de cambios' },
            { id: 'transmision_fugas_aceite', name: 'Fugas de aceite de transmisión' },
            { id: 'transmision_ruidos_cambio', name: 'Ruidos al cambiar de marcha' },
            { id: 'transmision_otros', name: 'Otros', hasDescription: true }
        ]
    },
    SISTEMA_REFRIGERACION: {
        id: 'sistema_refrigeracion',
        name: 'Sistema de refrigeración',
        icon: '🌡️',
        problems: [
            { id: 'refrigeracion_sobrecalentamiento', name: 'Motor se sobrecalienta' },
            { id: 'refrigeracion_fuga_refrigerante', name: 'Fuga de refrigerante' },
            { id: 'refrigeracion_radiador_obstruido', name: 'Radiador obstruido' },
            { id: 'refrigeracion_ventilador_no_enciende', name: 'Ventilador no enciende' },
            { id: 'refrigeracion_otros', name: 'Otros', hasDescription: true }
        ]
    },
    FRENOS_SUSPENSION: {
        id: 'frenos_suspension',
        name: 'Frenos y suspensión',
        icon: '🛑',
        problems: [
            { id: 'frenos_frena_mal', name: 'Frena mal o hace ruido' },
            { id: 'frenos_pedal_duro', name: 'Pedal de freno duro o esponjoso' },
            { id: 'frenos_vibraciones', name: 'Vibraciones al frenar' },
            { id: 'suspension_amortiguadores', name: 'Amortiguadores desgastados' },
            { id: 'suspension_direccion_dura', name: 'Dirección dura o desalineada' },
            { id: 'frenos_suspension_otros', name: 'Otros', hasDescription: true }
        ]
    },
    ESCAPE_EMISIONES: {
        id: 'escape_emisiones',
        name: 'Escape y emisiones',
        icon: '💨',
        problems: [
            { id: 'escape_fuga', name: 'Fuga en el escape' },
            { id: 'escape_ruidos_fuertes', name: 'Ruidos fuertes en el escape' },
            { id: 'escape_olor_gases', name: 'Olor a gases dentro del vehículo' },
            { id: 'emisiones_rechazo_control', name: 'Rechazo en control de emisiones' },
            { id: 'escape_emisiones_otros', name: 'Otros', hasDescription: true }
        ]
    },
    CARROCERIA_CONFORT: {
        id: 'carroceria_confort',
        name: 'Carrocería y confort',
        icon: '🚗',
        problems: [
            { id: 'confort_aire_no_enfría', name: 'Aire acondicionado no enfría' },
            { id: 'confort_ventanas_seguros', name: 'Ventanas o seguros eléctricos no funcionan' },
            { id: 'confort_ruidos_habitaculo', name: 'Ruidos dentro del habitáculo' },
            { id: 'confort_cerraduras_puertas', name: 'Cerraduras o puertas dañadas' },
            { id: 'carroceria_confort_otros', name: 'Otros', hasDescription: true }
        ]
    },
    OTROS: {
        id: 'otros',
        name: 'Otros',
        icon: '❓',
        problems: [
            { id: 'otros_general', name: 'Otros', hasDescription: true }
        ]
    }
};

const getAllCategories = () => {
    return Object.values(REPAIR_CATEGORIES);
};

const getCategoryById = (categoryId) => {
    return Object.values(REPAIR_CATEGORIES).find(category => category.id === categoryId);
};

const getProblemById = (categoryId, problemId) => {
    const category = getCategoryById(categoryId);
    if (!category) return null;
    return category.problems.find(problem => problem.id === problemId);
};

const requiresDescription = (categoryId, problemId) => {
    const problem = getProblemById(categoryId, problemId);
    return problem ? problem.hasDescription : false;
};

module.exports = {
    REPAIR_CATEGORIES,
    getAllCategories,
    getCategoryById,
    getProblemById,
    requiresDescription
};
