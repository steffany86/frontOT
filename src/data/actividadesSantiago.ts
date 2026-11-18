// Plan de actividades de Santiago (nacio el 07/11/2025), generado a partir del plan original.
export type HabilidadKey = 'mg' | 'mf' | 'le' | 'co' | 'so'
export type PedagogiaKey = 'M' | 'W' | 'R'

export type PasoActividad = { nom: string; min: number; hab: HabilidadKey; desc: string; ped: PedagogiaKey }
export type DiaPlan = { d: number; n: string; t: string; obj: string; dur: string; mat: string; p: PasoActividad[] }
export type SemanaPlan = { n: number; ini: string; tema: string; foco: string; dias: DiaPlan[] }

export const FECHA_NACIMIENTO = '2025-11-07'

export const HABILIDADES: Record<HabilidadKey, { n: string; c: string }> = {"mg":{"n":"Motricidad gruesa","c":"#ef4444"},"mf":{"n":"Motricidad fina","c":"#f59e0b"},"le":{"n":"Lenguaje","c":"#3b82f6"},"co":{"n":"Cognición y resolución de problemas","c":"#10b981"},"so":{"n":"Imitación y social","c":"#a855f7"}}

export const PEDAGOGIAS: Record<PedagogiaKey, { n: string; c: string }> = {"M":{"n":"Montessori","c":"#0ea5e9"},"W":{"n":"Waldorf","c":"#d97706"},"R":{"n":"Reggio Emilia","c":"#db2777"}}

export const NIVELES: { v: number; t: string; c: string }[] = [{"v":0,"t":"No lo intentó","c":"#9ca3af"},{"v":1,"t":"Con mucha ayuda","c":"#f97316"},{"v":2,"t":"Con poca ayuda","c":"#eab308"},{"v":3,"t":"Lo logró solo","c":"#16a34a"}]

export const SEMANAS: SemanaPlan[] = [
 {
  "n": 1,
  "ini": "2026-10-19",
  "tema": "Exploradores (plan original)",
  "foco": "Cambios de posición, resolver problemas y lenguaje.",
  "dias": [
   {
    "d": 1,
    "n": "Lunes",
    "t": "Circuito de exploradores",
    "obj": "Estimular los cambios de posición, la coordinación y la búsqueda de soluciones.",
    "dur": "25–30 min",
    "mat": "Colchoneta, cojín firme bajo, juguete favorito, canasta y bloques grandes.",
    "p": [
     {
      "nom": "Rescate del tesoro",
      "min": 5,
      "hab": "mg",
      "desc": "Coloca tres juguetes en diferentes posiciones (a un lado, un poco adelante y cerca de un cojín bajo). Anímalo a girar, inclinarse, cambiar de postura y desplazarse para alcanzarlos. No lo coloques en posiciones que aún no domina.",
      "ped": "M"
     },
     {
      "nom": "Misión lateral",
      "min": 5,
      "hab": "mg",
      "desc": "Pon un juguete sobre un sofá bajo, firme y seguro. Invítalo a alcanzarlo sujetándose y, si ya puede, a dar pasos laterales. Mueve el juguete a cada lado. No lo fuerces a caminar.",
      "ped": "M"
     },
     {
      "nom": "Carga y descarga",
      "min": 7,
      "hab": "co",
      "desc": "Cinco bloques grandes en una canasta: sacarlos y volverlos a meter. Cambia la canasta de lugar y dile «Busca otro bloque» o «Ponlo dentro». Observa si comprende sin señalar cada objeto.",
      "ped": "M"
     },
     {
      "nom": "Lenguaje y cierre",
      "min": 5,
      "hab": "le",
      "desc": "Leer un libro de animales. Pregunta «¿Dónde está el perro?» y espera unos segundos. Acepta que mire, señale, vocalice o imite el sonido.",
      "ped": "W"
     }
    ]
   },
   {
    "d": 2,
    "n": "Martes",
    "t": "Pequeño ingeniero",
    "obj": "Resolver problemas sencillos, practicar la permanencia del objeto y mejorar la coordinación mano-ojo.",
    "dur": "25–30 min",
    "mat": "Vasos apilables grandes, caja abierta, pelota grande y juguetes conocidos.",
    "p": [
     {
      "nom": "¿Dónde está?",
      "min": 5,
      "hab": "co",
      "desc": "Esconde parcialmente un juguete bajo una tela ligera; luego por completo, delante de él, y observa si levanta la tela. Reto: cambiar el juguete de lugar mientras mira.",
      "ped": "M"
     },
     {
      "nom": "Torres que se derrumban",
      "min": 7,
      "hab": "mf",
      "desc": "Construye una torre de 2–3 bloques y deja que la derribe. Entrégale un bloque para colocar encima. Si no puede apilar, que lo entregue o lo ponga en una caja.",
      "ped": "M"
     },
     {
      "nom": "La caja misteriosa",
      "min": 7,
      "hab": "le",
      "desc": "Tres objetos grandes y seguros en una caja abierta: sacarlos uno por uno. Luego pídele uno concreto: «¿Me das la pelota?». Cambia el contenido una sola vez.",
      "ped": "R"
     },
     {
      "nom": "Encaja y descubre",
      "min": 5,
      "hab": "co",
      "desc": "Vasos apilables de distintos tamaños. Modela cómo meter uno dentro de otro y deja que pruebe. Si se frustra, muestra el movimiento una vez y retírate.",
      "ped": "M"
     }
    ]
   },
   {
    "d": 3,
    "n": "Miércoles",
    "t": "Movimiento y equilibrio",
    "obj": "Practicar las transiciones entre sentado, arrodillado y de pie, según lo que ya pueda hacer por sí mismo.",
    "dur": "25–30 min",
    "mat": "Colchoneta firme, juguetes, sofá estable y caja grande ligera.",
    "p": [
     {
      "nom": "Recorrido con estaciones",
      "min": 8,
      "hab": "mg",
      "desc": "Tres juguetes en el suelo, separados. Que llegue a cada uno con su forma habitual de desplazarse (rodar, pivotar, arrastrarse…). No lo pongas a gatear a la fuerza.",
      "ped": "M"
     },
     {
      "nom": "Agáchate y encuentra",
      "min": 5,
      "hab": "mg",
      "desc": "Si ya se para sujetándose, juguete en superficie baja y segura para agacharse y volver a incorporarse. No lo sostengas de las manos. Si pierde estabilidad, termina el juego.",
      "ped": "M"
     },
     {
      "nom": "Empuja el paquete",
      "min": 5,
      "hab": "co",
      "desc": "Caja grande y ligera, vacía, que no se vuelque ni deslice mucho, con un juguete dentro. Que la explore, la empuje o recupere el juguete. Sin muebles con ruedas.",
      "ped": "R"
     },
     {
      "nom": "Pelota de ida y vuelta",
      "min": 5,
      "hab": "so",
      "desc": "Sentados frente a frente, rueden una pelota grande y ligera. Di «va» y «viene» y espera a que intente devolverla.",
      "ped": "M"
     },
     {
      "nom": "Pausa de relajación",
      "min": 3,
      "hab": "le",
      "desc": "Canción tranquila, libro de imágenes y conversación cara a cara.",
      "ped": "W"
     }
    ]
   },
   {
    "d": 4,
    "n": "Jueves",
    "t": "Manos inteligentes y lenguaje",
    "obj": "Desarrollar precisión manual, imitación, comprensión de palabras y comunicación.",
    "dur": "25–30 min",
    "mat": "Aros grandes apropiados para su edad, recipientes anchos, libro de cartón y muñeco.",
    "p": [
     {
      "nom": "La fábrica de objetos",
      "min": 7,
      "hab": "mf",
      "desc": "Objetos grandes en un recipiente ancho: sacarlos, cambiarlos de mano y devolverlos. Introduce «dentro», «fuera», «dame» y «más».",
      "ped": "M"
     },
     {
      "nom": "Aros de colores",
      "min": 5,
      "hab": "mf",
      "desc": "Apilador con piezas grandes y seguras. Primero que retire los aros; luego modela cómo poner uno en el soporte. No importa si todavía no acierta.",
      "ped": "M"
     },
     {
      "nom": "Copia mi movimiento",
      "min": 5,
      "hab": "so",
      "desc": "Acción sencilla: aplaudir, golpear suavemente la mesa o saludar. Espera su respuesta y celebra cualquier intento de imitación.",
      "ped": "M"
     },
     {
      "nom": "El cuento interactivo",
      "min": 7,
      "hab": "le",
      "desc": "Mira un libro con él, señala y nombra un animal. Pregunta «¿Dónde está el gato?» y espera 5–10 segundos. También vale que disfrute pasando las páginas.",
      "ped": "W"
     },
     {
      "nom": "Juego simbólico inicial",
      "min": 3,
      "hab": "so",
      "desc": "Con un muñeco, simula abrazarlo o acostarlo e invítalo a imitarte. Puede interesarle más manipularlo que imitar; ambas respuestas son válidas.",
      "ped": "W"
     }
    ]
   },
   {
    "d": 5,
    "n": "Viernes",
    "t": "Mini circuito Montessori y autonomía",
    "obj": "Integrar movimiento, exploración, comprensión de instrucciones y participación en pequeñas rutinas.",
    "dur": "25–30 min",
    "mat": "Colchoneta, escalón de espuma bajo, canasta, pelota grande y tres juguetes familiares.",
    "p": [
     {
      "nom": "Circuito de tres estaciones",
      "min": 8,
      "hab": "mg",
      "desc": "E1: alcanzar un juguete en el suelo. E2: rodear un cojín o cambiar de dirección. E3: llegar a una canasta y sacar un juguete. Adapta el recorrido a su forma real de desplazarse. Escalón solo con supervisión cercana.",
      "ped": "M"
     },
     {
      "nom": "Busca el que falta",
      "min": 5,
      "hab": "co",
      "desc": "Muestra tres juguetes, guarda uno en una caja mientras observa y pregunta cuál falta. Si no responde, vuelve a mostrarlos.",
      "ped": "M"
     },
     {
      "nom": "Guardamos juntos",
      "min": 5,
      "hab": "so",
      "desc": "Entrégale los juguetes uno por uno y pídele que los ponga en una canasta. Modela y acompaña con gestos. El objetivo es participar, no ordenar perfecto.",
      "ped": "M"
     },
     {
      "nom": "Pelota y turnos",
      "min": 5,
      "hab": "so",
      "desc": "Rueden una pelota grande entre los dos. Introduce «mi turno» y «tu turno» de forma natural.",
      "ped": "M"
     },
     {
      "nom": "Cierre de la semana",
      "min": 5,
      "hab": "le",
      "desc": "Canción favorita, libro y abrazo. Registra qué actividad le interesó más y cuál le costó.",
      "ped": "W"
     }
    ]
   }
  ]
 },
 {
  "n": 2,
  "ini": "2026-10-26",
  "tema": "Túneles, sentidos y rutinas",
  "foco": "Exploración libre con materiales naturales, causa y efecto, rutinas.",
  "dias": [
   {
    "d": 1,
    "n": "Lunes",
    "t": "Túneles y tesoros",
    "obj": "Planificar el cuerpo para pasar por espacios y explorar libremente objetos naturales.",
    "dur": "25–30 min",
    "mat": "Cojines firmes, manta, cesta, objetos naturales grandes y seguros.",
    "p": [
     {
      "nom": "Túnel de cojines",
      "min": 5,
      "hab": "mg",
      "desc": "Arma un túnel bajo con cojines firmes y una manta; pon un juguete al otro lado. Deja que decida cómo pasar; acompaña sin empujarlo.",
      "ped": "R"
     },
     {
      "nom": "Cruzar el puente",
      "min": 6,
      "hab": "mg",
      "desc": "Un rollo de manta firme o colchoneta baja a ras de suelo para pasar por encima gateando o caminando sujeto. Nada elevado.",
      "ped": "M"
     },
     {
      "nom": "Cesta de los tesoros",
      "min": 8,
      "hab": "co",
      "desc": "Cesta con 6–8 objetos grandes y seguros de distintos materiales (cuchara de madera, esponja natural, pelota de lana, tela, cepillo de madera). Que explore sin dirigirlo; solo nombra lo que toma.",
      "ped": "R"
     },
     {
      "nom": "Canción de cierre",
      "min": 4,
      "hab": "so",
      "desc": "Siempre la misma canción corta con gestos suaves, mecerlo y un abrazo. La repetición le da seguridad (ritmo Waldorf).",
      "ped": "W"
     }
    ]
   },
   {
    "d": 2,
    "n": "Martes",
    "t": "Causa y efecto",
    "obj": "Descubrir que sus acciones producen resultados y explorar sonidos.",
    "dur": "25–30 min",
    "mat": "Ollas, cuchara de madera, bandeja, esponja, tubo de cartón y pelota grande.",
    "p": [
     {
      "nom": "Orquesta de cocina",
      "min": 6,
      "hab": "co",
      "desc": "Ollas, cuchara de madera y caja de cartón para golpear. Alterna suave y fuerte. Prefiere sonidos naturales a juguetes electrónicos.",
      "ped": "W"
     },
     {
      "nom": "Esponja y agua",
      "min": 7,
      "hab": "mf",
      "desc": "Bandeja con poca agua, una esponja y una taza: exprimir, trasvasar y tocar. Supervisión constante y a su lado.",
      "ped": "M"
     },
     {
      "nom": "Pelota por el tubo",
      "min": 6,
      "hab": "co",
      "desc": "Suelta una pelota grande por un tubo de cartón y deja que la vea salir. Luego que él lo intente.",
      "ped": "M"
     },
     {
      "nom": "Libro de texturas",
      "min": 5,
      "hab": "le",
      "desc": "Libro o telas con texturas: nombra «suave», «áspero», «liso» mientras las toca.",
      "ped": "W"
     }
    ]
   },
   {
    "d": 3,
    "n": "Miércoles",
    "t": "Sentidos y naturaleza",
    "obj": "Afinar los sentidos con elementos naturales y mantener el equilibrio en distintas superficies.",
    "dur": "25–30 min",
    "mat": "Ventana con luz, papel celofán de colores, linterna, mantas y alfombras.",
    "p": [
     {
      "nom": "Paseo al aire libre",
      "min": 8,
      "hab": "co",
      "desc": "Salir al jardín o parque: tocar hojas grandes, pasto, escuchar pájaros y nombrar lo que vean. Sin forzar a que toque lo que no quiera.",
      "ped": "W"
     },
     {
      "nom": "Luz y sombra",
      "min": 6,
      "hab": "co",
      "desc": "Pega celofanes de colores a una ventana y juega con las sombras de sus manos o con una linterna en la pared.",
      "ped": "R"
     },
     {
      "nom": "Superficies distintas",
      "min": 6,
      "hab": "mg",
      "desc": "Descalzo, que se desplace o camine sujeto sobre alfombra, manta y colchoneta. Observa cómo ajusta el equilibrio.",
      "ped": "M"
     },
     {
      "nom": "Masaje con canción",
      "min": 5,
      "hab": "so",
      "desc": "Masaje suave de manos y pies con una canción de dedos («este dedito…»).",
      "ped": "W"
     }
    ]
   },
   {
    "d": 4,
    "n": "Jueves",
    "t": "Manos y palabras",
    "obj": "Practicar la pinza y asociar palabras con objetos reales.",
    "dur": "25–30 min",
    "mat": "Caja con pañuelos de tela, tazas, fotos de objetos reales, bloques medianos.",
    "p": [
     {
      "nom": "Caja de pañuelos",
      "min": 6,
      "hab": "mf",
      "desc": "Una caja con pañuelos de tela de colores para sacar de uno en uno. Nombra «saca», «más», «otro».",
      "ped": "M"
     },
     {
      "nom": "Pasar de taza a taza",
      "min": 6,
      "hab": "mf",
      "desc": "Bloques medianos (nunca piezas pequeñas) de una taza a otra. Si ya come sólidos, puede usarse fruta blanda en trozos grandes bajo supervisión.",
      "ped": "M"
     },
     {
      "nom": "Señalar y nombrar",
      "min": 7,
      "hab": "le",
      "desc": "Fotos reales de objetos familiares (biberón, perro, pelota, mamá). Nómbralos con claridad y espera su gesto o sonido.",
      "ped": "M"
     },
     {
      "nom": "Canción con gestos",
      "min": 6,
      "hab": "so",
      "desc": "Canción con palmas, arriba y abajo. Pausa antes del gesto final para que él lo anticipe.",
      "ped": "W"
     }
    ]
   },
   {
    "d": 5,
    "n": "Viernes",
    "t": "Mi espacio y mis rutinas",
    "obj": "Participar en pequeñas rutinas y elegir con autonomía dentro de límites seguros.",
    "dur": "25–30 min",
    "mat": "Estante bajo, 4–5 juguetes, vaso pequeño, pañuelo o tela.",
    "p": [
     {
      "nom": "Mi estante ordenado",
      "min": 6,
      "hab": "so",
      "desc": "Estante bajo con 4–5 juguetes. Él elige uno y lo devuelve contigo al terminar.",
      "ped": "M"
     },
     {
      "nom": "Beber de un vaso pequeño",
      "min": 5,
      "hab": "so",
      "desc": "Vaso pequeño con muy poca agua, siempre con ayuda. Practica a la hora de la merienda.",
      "ped": "M"
     },
     {
      "nom": "Esconder y encontrar",
      "min": 6,
      "hab": "co",
      "desc": "Esconde un juguete parcialmente bajo una tela, luego por completo. Celebra cuando lo encuentra.",
      "ped": "R"
     },
     {
      "nom": "Cierre de la semana",
      "min": 5,
      "hab": "le",
      "desc": "Canción favorita, libro y abrazo. Anota qué actividad le interesó más y cuál le costó.",
      "ped": "W"
     }
    ]
   }
  ]
 },
 {
  "n": 3,
  "ini": "2026-11-02",
  "tema": "Mi primer año",
  "foco": "Ritmo, repetición y la semana del cumpleaños (7 de nov).",
  "dias": [
   {
    "d": 1,
    "n": "Lunes",
    "t": "Movimiento con ritmo",
    "obj": "Moverse al ritmo de la música y consolidar el ponerse de pie con apoyo.",
    "dur": "25–30 min",
    "mat": "Pandero o tambor suave, mueble estable bajo, tela transparente, muñeco.",
    "p": [
     {
      "nom": "Moverse con ritmo",
      "min": 6,
      "hab": "mg",
      "desc": "Música suave de pandero o tambor. Acompaña con un ritmo que se adapte a su forma de moverse y haz pausas cuando se detenga.",
      "ped": "W"
     },
     {
      "nom": "Ponerse de pie con apoyo",
      "min": 6,
      "hab": "mg",
      "desc": "Pon un juguete encima de un mueble bajo y estable para que se apoye y se levante. No lo sostengas de las manos; si pierde estabilidad, para.",
      "ped": "M"
     },
     {
      "nom": "Rueda de movimientos",
      "min": 7,
      "hab": "so",
      "desc": "Sentados en rueda con un muñeco: «arriba, abajo, giramos» con gestos suaves, siempre igual.",
      "ped": "W"
     },
     {
      "nom": "Mirar a través de telas",
      "min": 6,
      "hab": "co",
      "desc": "Telas transparentes y opacas colgadas bajo: mirar a través y jugar a asomarse.",
      "ped": "R"
     }
    ]
   },
   {
    "d": 2,
    "n": "Martes",
    "t": "Mente exploradora",
    "obj": "Comparar materiales y fijar la permanencia del objeto.",
    "dur": "25–30 min",
    "mat": "Cesta de objetos de metal grandes, caja con agujero, pelota de tela, álbum de fotos.",
    "p": [
     {
      "nom": "Cesta de los tesoros: metal",
      "min": 8,
      "hab": "co",
      "desc": "Nueva cesta con objetos grandes de metal seguros (cucharas, tapa de olla, aro de llaves grande). Observa qué compara y cómo los golpea.",
      "ped": "R"
     },
     {
      "nom": "Caja de la permanencia",
      "min": 6,
      "hab": "co",
      "desc": "Caja con un agujero circular grande y una pelota de tela: meterla y verla desaparecer o salir por un lado.",
      "ped": "M"
     },
     {
      "nom": "Encajar una forma",
      "min": 6,
      "hab": "mf",
      "desc": "Cilindro o cubo grande en una caja con un solo agujero. Modela una vez y retira tu ayuda.",
      "ped": "M"
     },
     {
      "nom": "Álbum de la familia",
      "min": 5,
      "hab": "le",
      "desc": "Fotos reales de la familia plastificadas. Nombra «mamá», «papá», «abuela» y observa si señala.",
      "ped": "R"
     }
    ]
   },
   {
    "d": 3,
    "n": "Miércoles",
    "t": "Sentidos y naturaleza",
    "obj": "Juego libre con elementos naturales y planos inclinados.",
    "dur": "25–30 min",
    "mat": "Cucharas y cuencos de madera, hojas grandes, tabla inclinada, pelotas.",
    "p": [
     {
      "nom": "Cocinitas de madera",
      "min": 7,
      "hab": "so",
      "desc": "Cuenco, cuchara de madera y telas: «cocinar» e imitar. Juego sencillo y real.",
      "ped": "W"
     },
     {
      "nom": "Recoger hojas y flores",
      "min": 8,
      "hab": "co",
      "desc": "Paseo afuera con una cesta para recoger hojas grandes y flores seguras. Mira, huele y nombra sin forzar.",
      "ped": "R"
     },
     {
      "nom": "Rodar por la rampa",
      "min": 6,
      "hab": "co",
      "desc": "Una tabla con poca inclinación y pelotas grandes para rodar. Que repita y observe qué pasa.",
      "ped": "R"
     },
     {
      "nom": "Canción de cuna",
      "min": 4,
      "hab": "so",
      "desc": "Descanso: la misma canción de cuna, luz baja y mecerlo.",
      "ped": "W"
     }
    ]
   },
   {
    "d": 4,
    "n": "Jueves",
    "t": "Manos y palabras",
    "obj": "Trabajar la pinza y la comprensión de palabras de uso diario.",
    "dur": "25–30 min",
    "mat": "Libro de cartón, cuencos, bloques medianos, muñeco de animales.",
    "p": [
     {
      "nom": "Trasvase de objetos grandes",
      "min": 6,
      "hab": "mf",
      "desc": "Pasar bloques medianos de un cuenco a otro con las manos. Nombra «dentro», «fuera», «más».",
      "ped": "M"
     },
     {
      "nom": "Pasar páginas de cartón",
      "min": 6,
      "hab": "le",
      "desc": "Libro de cartón: que pase las páginas a su ritmo. Nombra lo que señala.",
      "ped": "M"
     },
     {
      "nom": "Palabra del día",
      "min": 7,
      "hab": "le",
      "desc": "Elige 3 palabras (agua, mamá, más) y úsalas en situaciones reales durante la actividad. Celebra cualquier sonido que se parezca.",
      "ped": "M"
     },
     {
      "nom": "Sonidos de animales",
      "min": 6,
      "hab": "so",
      "desc": "Un muñeco de animal: imita su sonido y espera que intente imitarte.",
      "ped": "W"
     }
    ]
   },
   {
    "d": 5,
    "n": "Viernes",
    "t": "Mi primer año",
    "obj": "Mirar su historia, participar en la rutina y vivir un ritual de cumpleaños tranquilo.",
    "dur": "25–30 min",
    "mat": "Fotos del primer año, vaso, servilleta, canción de cumpleaños.",
    "p": [
     {
      "nom": "Mi libro del año",
      "min": 7,
      "hab": "so",
      "desc": "Mira con él fotos de su primer año y cuéntale lo que ves. Elige 3 para un cuaderno de documentación (Reggio): foto + qué hacía + qué hace hoy.",
      "ped": "R"
     },
     {
      "nom": "Preparar la mesa",
      "min": 6,
      "hab": "so",
      "desc": "Que te ayude a colocar la servilleta o el vaso. Participa con lo que pueda.",
      "ped": "M"
     },
     {
      "nom": "Ritual de cumpleaños",
      "min": 5,
      "hab": "so",
      "desc": "Canción de cumpleaños, abrazo y una luz LED en vez de vela. Sin ruido fuerte ni soplar velas.",
      "ped": "W"
     },
     {
      "nom": "Cierre de la semana",
      "min": 5,
      "hab": "le",
      "desc": "Canción favorita, libro y abrazo. Anota qué actividad le interesó más y cuál le costó.",
      "ped": "W"
     }
    ]
   }
  ]
 },
 {
  "n": 4,
  "ini": "2026-11-09",
  "tema": "Primeros pasos",
  "foco": "De pie, caminar con apoyo, apilar, señalar y dar/recibir.",
  "dias": [
   {
    "d": 1,
    "n": "Lunes",
    "t": "Empujar y caminar",
    "obj": "Ganar confianza al desplazarse de pie con apoyo y empezar a caminar.",
    "dur": "25–30 min",
    "mat": "Carrito o caja pesada estable, muebles estables, banquito bajo, pañuelos livianos.",
    "p": [
     {
      "nom": "Carrito para empujar",
      "min": 7,
      "hab": "mg",
      "desc": "Un carrito estable (no ligero ni con ruedas sueltas) para empujar caminando sujeto. A su ritmo y siempre supervisado.",
      "ped": "M"
     },
     {
      "nom": "Caminar entre muebles",
      "min": 6,
      "hab": "mg",
      "desc": "Muebles estables a una distancia que alcance. Pon un juguete en el siguiente apoyo.",
      "ped": "M"
     },
     {
      "nom": "Sentarse y levantarse del banquito",
      "min": 6,
      "hab": "mg",
      "desc": "Banquito bajo y estable: sentarse y volver a ponerse de pie con tu ayuda mínima.",
      "ped": "M"
     },
     {
      "nom": "Danza con pañuelos",
      "min": 5,
      "hab": "so",
      "desc": "Pañuelos livianos al ritmo de una música suave: mover, tirar al aire y mirar cómo caen.",
      "ped": "W"
     }
    ]
   },
   {
    "d": 2,
    "n": "Martes",
    "t": "Pequeño constructor",
    "obj": "Apilar y descubrir con menos ayuda.",
    "dur": "25–30 min",
    "mat": "Bloques grandes, caja de formas con tapa, dos cestas, pincel grueso y yogur.",
    "p": [
     {
      "nom": "Torre de dos",
      "min": 7,
      "hab": "mf",
      "desc": "Muéstrale cómo apilar un cubo sobre otro y espera. No es obligatorio que lo logre.",
      "ped": "M"
     },
     {
      "nom": "Caja de formas",
      "min": 6,
      "hab": "co",
      "desc": "Caja con tapa y formas grandes: abrir, meter y cerrar con ayuda.",
      "ped": "M"
     },
     {
      "nom": "¿Dónde está? 2",
      "min": 6,
      "hab": "co",
      "desc": "Esconde un juguete debajo de una de dos cestas mientras mira. Que busque.",
      "ped": "M"
     },
     {
      "nom": "Pintar con yogur",
      "min": 6,
      "hab": "mf",
      "desc": "Pintura casera segura (yogur con colorante natural) y pincel grueso sobre papel. Todo es comestible; no pasa nada si lo prueba.",
      "ped": "R"
     }
    ]
   },
   {
    "d": 3,
    "n": "Miércoles",
    "t": "Sentidos y naturaleza",
    "obj": "Experiencias sensoriales y plano de luz.",
    "dur": "25–30 min",
    "mat": "Superficies seguras, botellas selladas con agua coloreada, cesta de tesoros.",
    "p": [
     {
      "nom": "Paseo descalzo",
      "min": 8,
      "hab": "mg",
      "desc": "Descalzo sobre pasto, arena limpia o alfombras. Observa cómo ajusta el equilibrio.",
      "ped": "W"
     },
     {
      "nom": "Botellas de luz",
      "min": 7,
      "hab": "co",
      "desc": "Botellas selladas con agua coloreada puestas contra una ventana: mirar la luz de colores.",
      "ped": "R"
     },
     {
      "nom": "Cesta de los tesoros: suave y duro",
      "min": 7,
      "hab": "co",
      "desc": "Una cesta con objetos suaves y otra con duros. Que los explore y nombra las diferencias.",
      "ped": "R"
     },
     {
      "nom": "Masaje y canción",
      "min": 4,
      "hab": "so",
      "desc": "Masaje suave de piernas y pies antes del descanso con la misma canción.",
      "ped": "W"
     }
    ]
   },
   {
    "d": 4,
    "n": "Jueves",
    "t": "Manos y palabras",
    "obj": "Dar, recibir y señalar con intención.",
    "dur": "25–30 min",
    "mat": "Cuencos, cuchara grande, libro de sonidos, objetos conocidos.",
    "p": [
     {
      "nom": "Señalar lo que veo",
      "min": 7,
      "hab": "le",
      "desc": "Camina por la casa nombrando lo que ve («luz», «mesa») y espera que señale algo. Responde a cada gesto.",
      "ped": "M"
     },
     {
      "nom": "Dar y recibir",
      "min": 5,
      "hab": "so",
      "desc": "Intercambien un objeto: «toma», «dame». Espera su respuesta.",
      "ped": "M"
     },
     {
      "nom": "Pasar con cuchara",
      "min": 6,
      "hab": "mf",
      "desc": "Cuchara grande para pasar pelotas o bloques de más de 4 cm de un cuenco a otro. Nada de piezas pequeñas.",
      "ped": "M"
     },
     {
      "nom": "Libro con sonidos",
      "min": 6,
      "hab": "le",
      "desc": "Libro de animales: imita cada sonido y espera su respuesta.",
      "ped": "W"
     }
    ]
   },
   {
    "d": 5,
    "n": "Viernes",
    "t": "Autonomía y balance del mes",
    "obj": "Participar en rutinas y mirar los avances del mes.",
    "dur": "25–30 min",
    "mat": "Colchoneta, canasta, vaso, fruta blanda y notas del mes.",
    "p": [
     {
      "nom": "Circuito suave",
      "min": 8,
      "hab": "mg",
      "desc": "Alcanzar un juguete, rodear un cojín y llegar a una canasta, con la forma de moverse que ya tenga.",
      "ped": "M"
     },
     {
      "nom": "Ordenar con la cesta",
      "min": 6,
      "hab": "so",
      "desc": "Entrega los juguetes uno por uno y que los ponga en la cesta. Participar es suficiente.",
      "ped": "M"
     },
     {
      "nom": "Merienda autónoma",
      "min": 6,
      "hab": "so",
      "desc": "Trozos grandes de fruta blanda en una bandeja y vaso pequeño con ayuda. Siempre sentado y supervisado.",
      "ped": "M"
     },
     {
      "nom": "Cierre y balance del mes",
      "min": 5,
      "hab": "le",
      "desc": "Canción de cierre. Revisa la pestaña «Progreso» y anota qué cambió respecto a la semana 1.",
      "ped": "W"
     }
    ]
   }
  ]
 }
]

/** Id estable de cada actividad (semana 1 conserva el formato original dia-numero). */
export const actividadId = (semana: number, dia: number, indice: number): string =>
  semana === 1 ? `${dia}-${indice + 1}` : `w${semana}-${dia}-${indice + 1}`
