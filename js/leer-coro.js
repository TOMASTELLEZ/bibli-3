const parametros = new URLSearchParams(window.location.search);
const rutaHimno = parametros.get('himno');
const nombreHimno = parametros.get('nombre');
const numeroHimno = parametros.get('numero');
const titulo = document.getElementById('titulo-himno');
const contenedorLetra = document.getElementById('letra-himno');
const botonScroll = document.getElementById('btn-scroll-himno');

let animacionDesplazamiento = null;
let temporizadorDesplazamiento = null;
let inicioDesplazamiento = null;
let posicionInicial = 0;
let actualizarPresentacionLetra = null;

const patronAcorde = /^(?:[A-G](?:#|b)?(?:m|maj|min|dim|aug|sus|add)?\d*(?:\/[A-G](?:#|b)?(?:m)?\d*)?)(?:\s+(?:[A-G](?:#|b)?(?:m|maj|min|dim|aug|sus|add)?\d*(?:\/[A-G](?:#|b)?(?:m)?\d*)?))*$/;
const patronAcordeIndividual = /[A-G](?:#|b)?(?:m|maj|min|dim|aug|sus|add)?\d*(?:\/[A-G](?:#|b)?(?:m)?\d*)?/g;

function separarLetraEnRenglones(texto, anchoMaximo, medirTexto) {
    if (!texto || medirTexto(texto) <= anchoMaximo) {
        return [{ inicio: 0, fin: texto.length, texto }];
    }

    const renglones = [];
    let inicio = 0;

    while (inicio < texto.length) {
        let fin = inicio;
        let ultimoEspacio = -1;

        while (fin < texto.length && medirTexto(texto.slice(inicio, fin + 1)) <= anchoMaximo) {
            if (/\s/.test(texto[fin])) ultimoEspacio = fin;
            fin++;
        }

        if (fin === texto.length) {
            renglones.push({ inicio, fin, texto: texto.slice(inicio, fin) });
            break;
        }

        const corte = ultimoEspacio >= inicio ? ultimoEspacio + 1 : Math.max(inicio + 1, fin);
        renglones.push({ inicio, fin: corte, texto: texto.slice(inicio, corte).trimEnd() });
        inicio = corte;
        while (inicio < texto.length && /\s/.test(texto[inicio])) inicio++;
    }

    return renglones;
}

function obtenerAcordesPosicionados(texto) {
    return [...texto.matchAll(patronAcordeIndividual)].map(acorde => ({
        inicio: acorde.index,
        texto: acorde[0]
    }));
}

function crearLinea(texto, tipo = '') {
    const linea = document.createElement('span');
    linea.className = `letra-himno-linea${tipo ? ` letra-himno-${tipo}` : ''}`;

    if (!texto.trim() && tipo !== 'acorde') {
        linea.classList.add('letra-himno-espacio');
        linea.setAttribute('aria-hidden', 'true');
    }

    linea.textContent = texto || '\u00a0';
    return linea;
}

function renderizarParejaAcordeLetra(contenedor, acorde, texto, medirTexto, anchoMaximo) {
    const renglones = separarLetraEnRenglones(texto, anchoMaximo, medirTexto);
    const acordes = obtenerAcordesPosicionados(acorde);

    renglones.forEach((renglon, indice) => {
        const inicio = renglon.inicio;
        const fin = renglon.fin;
        const acordesRenglon = acordes
            .filter(item => item.inicio >= inicio && (item.inicio < fin || indice === renglones.length - 1))
            .reduce((resultado, item) => {
                const posicion = item.inicio - inicio;
                const espacios = Math.max(0, posicion - resultado.cursor);
                resultado.texto += `${' '.repeat(espacios)}${item.texto}`;
                resultado.cursor = posicion + item.texto.length;
                return resultado;
            }, { texto: '', cursor: 0 }).texto;
        const frase = document.createElement('div');
        frase.className = 'letra-himno-frase';
        frase.appendChild(crearLinea(acordesRenglon, 'acorde'));
        frase.appendChild(crearLinea(renglon.texto));
        contenedor.appendChild(frase);
    });
}

function detenerDesplazamiento() {
    if (temporizadorDesplazamiento !== null) {
        clearTimeout(temporizadorDesplazamiento);
        temporizadorDesplazamiento = null;
    }
    if (animacionDesplazamiento !== null) {
        cancelAnimationFrame(animacionDesplazamiento);
        animacionDesplazamiento = null;
    }
    inicioDesplazamiento = null;
    botonScroll.innerHTML = '<i class="fa-solid fa-play" aria-hidden="true"></i>';
    botonScroll.setAttribute('aria-label', 'Iniciar desplazamiento automático');
    botonScroll.setAttribute('title', 'Iniciar desplazamiento');
    botonScroll.setAttribute('aria-pressed', 'false');
}

function avanzarDesplazamiento(tiempo) {
    if (inicioDesplazamiento === null) {
        inicioDesplazamiento = tiempo;
    }

    const elementoDesplazable = document.scrollingElement;
    const maximo = elementoDesplazable.scrollHeight - elementoDesplazable.clientHeight;
    const segundos = (tiempo - inicioDesplazamiento) / 1000;
    const siguienteY = Math.min(Math.floor(posicionInicial + 30 * segundos), maximo);

    window.scrollTo(0, siguienteY);

    if (siguienteY >= maximo || maximo <= 0) {
        detenerDesplazamiento();
        return;
    }

    animacionDesplazamiento = requestAnimationFrame(avanzarDesplazamiento);
}

function iniciarDesplazamientoAutomatico() {
    if (animacionDesplazamiento !== null || temporizadorDesplazamiento !== null) return;

    botonScroll.innerHTML = '<i class="fa-solid fa-pause" aria-hidden="true"></i>';
    botonScroll.setAttribute('aria-label', 'Pausar desplazamiento automático');
    botonScroll.setAttribute('title', 'Pausar desplazamiento');
    botonScroll.setAttribute('aria-pressed', 'true');

    temporizadorDesplazamiento = window.setTimeout(() => {
        temporizadorDesplazamiento = null;

        const elementoDesplazable = document.scrollingElement;
        const maximo = elementoDesplazable.scrollHeight - elementoDesplazable.clientHeight;
        if (window.scrollY >= maximo) {
            window.scrollTo(0, 0);
        }

        posicionInicial = window.scrollY;
        inicioDesplazamiento = null;
        animacionDesplazamiento = requestAnimationFrame(avanzarDesplazamiento);
    }, 2000);
}

botonScroll.addEventListener('click', () => {
    if (animacionDesplazamiento === null && temporizadorDesplazamiento === null) {
        iniciarDesplazamientoAutomatico();
    } else {
        detenerDesplazamiento();
    }
});

async function cargarHimno() {
    if (!rutaHimno || !titulo || !contenedorLetra) {
        throw new Error('No se indicó un himno para mostrar.');
    }

    const rutaImport = new URL(rutaHimno, window.location.href);
    const modulo = await import(rutaImport.href);
    const himno = modulo.default;

    if (!himno || typeof himno.letra !== 'string') {
        throw new Error('El archivo del himno no contiene una letra válida.');
    }

    const nombre = nombreHimno || himno.nombre || 'Himno';
    titulo.textContent = numeroHimno ? `Himno ${numeroHimno}: ${nombre}` : nombre;
    const secciones = himno.letra.split(/\r?\n[ \t]*\r?\n/);
    const indicesCoro = secciones.reduce((indices, seccion, indice) => {
        if (seccion.split(/\r?\n/).some(linea => /^coro:?$/i.test(linea.trim()))) {
            indices.push(indice);
        }
        return indices;
    }, []);
    const indicesFinal = secciones.reduce((indices, seccion, indice) => {
        if (seccion.split(/\r?\n/).some(linea => /^final:?$/i.test(linea.trim()))) {
            indices.push(indice);
        }
        return indices;
    }, []);

    if (indicesCoro.length > 1) {
        throw new Error('La letra contiene más de una sección de coro.');
    }
    if (indicesFinal.length > 1) {
        throw new Error('La letra contiene más de una sección final.');
    }

    let seccionesLectura = secciones;
    if (indicesCoro.length === 1) {
        const indiceCoro = indicesCoro[0];
        const coro = secciones[indiceCoro];
        const indiceFinal = indicesFinal[0];
        seccionesLectura = [];

        if (indiceCoro === 0) {
            seccionesLectura.push(coro);
        }

        secciones.forEach((seccion, indice) => {
            if (indice === indiceCoro || indice === indiceFinal) return;
            seccionesLectura.push(seccion, coro);
        });

        if (indiceFinal !== undefined) {
            seccionesLectura.push(secciones[indiceFinal]);
        }
    }

    const letra = document.createElement('div');
    letra.className = 'letra-himno';
    const lineas = seccionesLectura.join('\n\n').split(/\r?\n/);
    contenedorLetra.replaceChildren(letra);
    actualizarPresentacionLetra = () => {
        letra.replaceChildren();
        const estilo = window.getComputedStyle(letra);
        const tamano = Number.parseFloat(estilo.fontSize) || 20;
        const lienzo = document.createElement('canvas');
        const contexto = lienzo.getContext('2d');

        if (contexto) {
            contexto.font = estilo.font || `${tamano}px ${estilo.fontFamily}`;
        }

        const medirTexto = texto => contexto
            ? contexto.measureText(texto).width
            : texto.length * tamano * 0.52;
        const anchoMaximo = Math.max(80, letra.clientWidth - tamano * 1.3);

        for (let indice = 0; indice < lineas.length; indice++) {
            const texto = lineas[indice];
            const siguiente = lineas[indice + 1];

            if (patronAcorde.test(texto.trim()) && siguiente?.trim()
                && !patronAcorde.test(siguiente.trim())
                && !/^(?:coro|final):?$/i.test(siguiente.trim())) {
                renderizarParejaAcordeLetra(letra, texto, siguiente, medirTexto, anchoMaximo);
                indice++;
                continue;
            }

            if (/^(?:coro|final):?$/i.test(texto.trim())) {
                letra.appendChild(crearLinea(texto, 'seccion'));
            } else {
                letra.appendChild(crearLinea(texto));
            }
        }
    };
    actualizarPresentacionLetra();
    window.addEventListener('resize', actualizarPresentacionLetra);
    document.fonts?.ready.then(actualizarPresentacionLetra);
}

cargarHimno().catch(error => {
    console.error('Error al cargar el himno:', error);
    if (contenedorLetra) {
        contenedorLetra.textContent = 'No se pudo cargar la letra del himno.';
    }
});
