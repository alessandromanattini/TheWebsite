// future.js

const canvas = document.querySelector("canvas");
const gl = canvas.getContext("webgl");

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;
gl.viewport(0, 0, canvas.width, canvas.height);

// Verifica che Web Audio API sia disponibile
if (!window.AudioContext && !window.webkitAudioContext) {
    alert("Il tuo browser non supporta l'API Web Audio.");
}

// Crea il contesto audio
const AudioContext = window.AudioContext || window.webkitAudioContext;
const audioCtx = new AudioContext();

// Carica i file audio per le particelle
let particleAudioBuffer;
const particleAudioUrl = 'audio/wordSound.wav'; // Percorso corretto

fetch(particleAudioUrl)
    .then(response => response.arrayBuffer())
    .then(arrayBuffer => audioCtx.decodeAudioData(arrayBuffer))
    .then(decodedData => {
        particleAudioBuffer = decodedData;
        console.log('Audio delle particelle caricato correttamente.');
    })
    .catch(error => console.error('Errore nel caricamento dell\'audio delle particelle:', error));

// Carica i file audio di scroll
const scrollSoundUrls = {
    300: 'audio/bassWS.mp3', // Percorso corretto
    1500: 'audio/arpWS.mp3'  // Nuovo suono per 700px
};

let scrollAudioBuffers = {
    300: null,
    1500: null
};

// Funzione per caricare gli audio di scroll
function loadScrollAudio(threshold) {
    fetch(scrollSoundUrls[threshold])
        .then(response => response.arrayBuffer())
        .then(arrayBuffer => audioCtx.decodeAudioData(arrayBuffer))
        .then(decodedData => {
            scrollAudioBuffers[threshold] = decodedData;
            console.log(`Audio di scroll a ${threshold}px caricato correttamente.`);
        })
        .catch(error => console.error(`Errore nel caricamento dell'audio di scroll a ${threshold}px:`, error));
}

// Carica entrambi gli audio di scroll
loadScrollAudio(300);
loadScrollAudio(1500);

// Funzione per riprodurre il suono delle particelle
function playParticleSound(particle) {
    if (!particleAudioBuffer || isParticleSoundPlaying) {
        return; // Non riprodurre se l'audio non è caricato o è già in riproduzione
    }

    // Crea un PannerNode per il panning
    const panner = audioCtx.createPanner();
    panner.panningModel = 'HRTF'; // Modello di panning
    panner.setPosition(particle.x, particle.y, 0); // Imposta la posizione del panner

    const source = audioCtx.createBufferSource();
    source.buffer = particleAudioBuffer;
    source.connect(panner);
    panner.connect(audioCtx.destination);
    source.start(0);

    isParticleSoundPlaying = true; // Imposta lo stato di riproduzione

    // Aggiungi un listener per il termine della riproduzione
    source.onended = () => {
        isParticleSoundPlaying = false; // Reset dello stato di riproduzione quando l'audio termina
    };
}

// Variabili per tracciare lo stato di riproduzione dei suoni delle particelle
let isParticleSoundPlaying = false;

// Parametri configurabili
const config = {
    particleCount: 23000, // Considera di ridurlo per migliorare le prestazioni
    textArray: ["Audio.", "Engineering.", "Science.", "Future."],
    mouseRadius: 0.1,
    particleSize: 2,
    forceMultiplier: 0.001,
    returnSpeed: 0.007,
    velocityDamping: 0.93,
    colorMultiplier: 40000,
    saturationMultiplier: 1000,
    textChangeInterval: 5000,
    rotationForceMultiplier: 0.5
};

let currentTextIndex = 0;
let nextTextTimeout;
let textCoordinates = [];

const mouse = {
    x: -500,
    y: -500,
    radius: config.mouseRadius
};

// Inizializza le particelle con proprietà aggiuntive per il suono
const particles = [];
for (let i = 0; i < config.particleCount; i++) {
    particles.push({ 
        x: 0, 
        y: 0, 
        baseX: 0, 
        baseY: 0, 
        vx: 0, 
        vy: 0,
        soundPlayed300: false, // Traccia se il suono a 300px è stato riprodotto
        lastSoundTime300: 0,    // Timestamp dell'ultima riproduzione a 300px
        soundPlayed700: false, // Traccia se il suono a 700px è stato riprodotto
        lastSoundTime700: 0     // Timestamp dell'ultima riproduzione a 700px
    });
}

// Shader per le particelle
const vertexShaderSource = `
    attribute vec2 a_position;
    attribute float a_hue;
    attribute float a_saturation;
    varying float v_hue;
    varying float v_saturation;
    void main() {
        gl_PointSize = ${config.particleSize.toFixed(1)};
        gl_Position = vec4(a_position, 0.0, 1.0);
        v_hue = a_hue;
        v_saturation = a_saturation;
    }
`;

const fragmentShaderSource = `
    precision mediump float;
    varying float v_hue;
    varying float v_saturation;
    void main() {
        float c = v_hue * 6.0;
        float x = 1.0 - abs(mod(c, 2.0) - 1.0);
        vec3 color;
        if (c < 1.0) color = vec3(1.0, x, 0.0);
        else if (c < 2.0) color = vec3(x, 1.0, 0.0);
        else if (c < 3.0) color = vec3(0.0, 1.0, x);
        else if (c < 4.0) color = vec3(0.0, x, 1.0);
        else if (c < 5.0) color = vec3(x, 0.0, 1.0);
        else color = vec3(1.0, 0.0, x);
        vec3 finalColor = mix(vec3(1.0), color, v_saturation);
        gl_FragColor = vec4(finalColor, 1.0);
    }
`;

// Funzioni per creare shader e programmi
function createShader(gl, type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.error(gl.getShaderInfoLog(shader));
        gl.deleteShader(shader);
        return null;
    }
    return shader;
}

function createProgram(gl, vertexShader, fragmentShader) {
    const program = gl.createProgram();
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        console.error(gl.getProgramInfoLog(program));
        gl.deleteProgram(program);
        return null;
    }
    return program;
}

// Crea e collega gli shader
const vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
const fragmentShader = createShader(
    gl,
    gl.FRAGMENT_SHADER,
    fragmentShaderSource
);
const program = createProgram(gl, vertexShader, fragmentShader);

// Ottieni le posizioni degli attributi
const positionAttributeLocation = gl.getAttribLocation(program, "a_position");
const hueAttributeLocation = gl.getAttribLocation(program, "a_hue");
const saturationAttributeLocation = gl.getAttribLocation(
    program,
    "a_saturation"
);

// Crea i buffer
const positionBuffer = gl.createBuffer();
const hueBuffer = gl.createBuffer();
const saturationBuffer = gl.createBuffer();

// Crea array per i dati delle particelle
const positions = new Float32Array(config.particleCount * 2);
const hues = new Float32Array(config.particleCount);
const saturations = new Float32Array(config.particleCount);

// Funzione per ottenere le coordinate del testo
function getTextCoordinates(text) {
    const ctx = document.createElement("canvas").getContext("2d");
    ctx.canvas.width = canvas.width;
    ctx.canvas.height = canvas.height;
    const fontSize = Math.min(canvas.width / 6, canvas.height / 6);
    ctx.font = `900 ${fontSize}px Arial`;
    ctx.fillStyle = "white";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(text, canvas.width / 2, canvas.height / 2);
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    const coordinates = [];
    for (let y = 0; y < canvas.height; y += 4) {
        for (let x = 0; x < canvas.width; x += 4) {
            const index = (y * canvas.width + x) * 4;
            if (imageData[index + 3] > 128) {
                coordinates.push({
                    x: (x / canvas.width) * 2 - 1,
                    y: (y / canvas.height) * -2 + 1
                });
            }
        }
    }
    return coordinates;
}

// Funzione per creare le particelle
function createParticles() {
    textCoordinates = getTextCoordinates(config.textArray[currentTextIndex]);
    for (let i = 0; i < config.particleCount; i++) {
        const randomIndex = Math.floor(Math.random() * textCoordinates.length);
        const { x, y } = textCoordinates[randomIndex];
        particles[i].x = particles[i].baseX = x;
        particles[i].y = particles[i].baseY = y;
        particles[i].soundPlayed300 = false; // Inizializza soundPlayed per 300px
        particles[i].lastSoundTime300 = 0;    // Inizializza lastSoundTime per 300px
        particles[i].soundPlayed700 = false; // Inizializza soundPlayed per 700px
        particles[i].lastSoundTime700 = 0;    // Inizializza lastSoundTime per 700px
    }
}

// Funzione per aggiornare le particelle
function updateParticles() {
    const currentTime = Date.now();
    const soundCooldown = 500; // Cooldown di 500 ms per evitare suoni sovrapposti

    for (let i = 0; i < config.particleCount; i++) {
        const particle = particles[i];
        const dx = mouse.x - particle.x;
        const dy = mouse.y - particle.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        // Forza di interazione
        const forceDirectionX = distance !== 0 ? dx / distance : 0;
        const forceDirectionY = distance !== 0 ? dy / distance : 0;
        const maxDistance = mouse.radius;
        const force = (maxDistance - distance) / maxDistance;
        const directionX = forceDirectionX * force * config.forceMultiplier;
        const directionY = forceDirectionY * force * config.forceMultiplier;

        const angle = Math.atan2(dy, dx);

        const rotationForceX = Math.sin(
            -Math.cos(angle * -1) *
            Math.sin(config.rotationForceMultiplier * Math.cos(force)) *
            Math.sin(distance * distance) *
            Math.sin(angle * distance)
        );

        const rotationForceY = Math.sin(
            Math.cos(angle * 1) *
            Math.sin(config.rotationForceMultiplier * Math.sin(force)) *
            Math.sin(distance * distance) *
            Math.cos(angle * distance)
        );

        if (distance < mouse.radius) {
            particle.vx -= directionX + rotationForceX;
            particle.vy -= directionY + rotationForceY;
        } else {
            particle.vx += (particle.baseX - particle.x) * config.returnSpeed;
            particle.vy += (particle.baseY - particle.y) * config.returnSpeed;
        }

        // Gestisci la riproduzione del suono a 300px
        const hoverThreshold300 = 0.02;
        if (distance < hoverThreshold300) {
            if (!particle.soundPlayed300 && (currentTime - particle.lastSoundTime300) > soundCooldown) {
                playParticleSound(particle); // Riproduci il suono delle particelle
                particle.soundPlayed300 = true;
                particle.lastSoundTime300 = currentTime;
                //console.log(`Suono delle particelle riprodotto per particella ${i} a (${particle.x.toFixed(2)}, ${particle.y.toFixed(2)})`);
            }
        } else {
            particle.soundPlayed300 = false;
        }

        // Gestisci la riproduzione del suono a 700px
        const hoverThreshold700 = 0.02;
        if (distance < hoverThreshold700) {
            if (!particle.soundPlayed700 && (currentTime - particle.lastSoundTime700) > soundCooldown) {
                playParticleSound(particle); // Puoi creare una funzione separata se vuoi suoni diversi
                particle.soundPlayed700 = true;
                particle.lastSoundTime700 = currentTime;
                //console.log(`Suono delle particelle riprodotto per particella ${i} a (${particle.x.toFixed(2)}, ${particle.y.toFixed(2)})`);
            }
        } else {
            particle.soundPlayed700 = false;
        }

        // Aggiorna posizione e velocità
        particle.x += particle.vx;
        particle.y += particle.vy;
        particle.vx *= config.velocityDamping;
        particle.vy *= config.velocityDamping;

        const speed = Math.sqrt(
            particle.vx * particle.vx + particle.vy * particle.vy
        );
        const hue = (speed * config.colorMultiplier) % 360;

        hues[i] = hue / 360;
        saturations[i] = Math.min(speed * config.saturationMultiplier, 1);
        positions[i * 2] = particle.x;
        positions[i * 2 + 1] = particle.y;
    }

    // Aggiorna i buffer WebGL
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, positions, gl.DYNAMIC_DRAW);
    gl.bindBuffer(gl.ARRAY_BUFFER, hueBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, hues, gl.DYNAMIC_DRAW);
    gl.bindBuffer(gl.ARRAY_BUFFER, saturationBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, saturations, gl.DYNAMIC_DRAW);
}

// Funzione di animazione
function animate() {
    updateParticles();

    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.vertexAttribPointer(positionAttributeLocation, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(positionAttributeLocation);
    gl.bindBuffer(gl.ARRAY_BUFFER, hueBuffer);
    gl.vertexAttribPointer(hueAttributeLocation, 1, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(hueAttributeLocation);
    gl.bindBuffer(gl.ARRAY_BUFFER, saturationBuffer);
    gl.vertexAttribPointer(saturationAttributeLocation, 1, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(saturationAttributeLocation);
    gl.useProgram(program);
    gl.drawArrays(gl.POINTS, 0, config.particleCount);
    requestAnimationFrame(animate);
}

// Event listener per il movimento del mouse
canvas.addEventListener("mousemove", (event) => {
    mouse.x = (event.clientX / canvas.width) * 2 - 1;
    mouse.y = (event.clientY / canvas.height) * -2 + 1;
});

// Event listener per l'uscita del mouse dal canvas
canvas.addEventListener("mouseleave", () => {
    mouse.x = -500;
    mouse.y = -500;
});

// Event listener per il ridimensionamento della finestra
window.addEventListener("resize", () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    gl.viewport(0, 0, canvas.width, canvas.height);
    createParticles();
});

// Funzione per cambiare il testo e aggiornare le coordinate delle particelle
function changeText() {
    currentTextIndex = (currentTextIndex + 1) % config.textArray.length;
    const newCoordinates = getTextCoordinates(config.textArray[currentTextIndex]);
    for (let i = 0; i < config.particleCount; i++) {
        const randomIndex = Math.floor(Math.random() * newCoordinates.length);
        const { x, y } = newCoordinates[randomIndex];
        particles[i].baseX = x;
        particles[i].baseY = y;
    }
    nextTextTimeout = setTimeout(changeText, config.textChangeInterval);
}

// Funzione per inizializzare le particelle e avviare l'animazione
gl.clearColor(0, 0, 0, 1);
createParticles();
animate();
nextTextTimeout = setTimeout(changeText, config.textChangeInterval);

// ------------------- BACKGROUND AUDIO ------------------- //

const bckAudio = new Audio('audio/backgroundSound.mp3');
bckAudio.volume = 0.75;
// Assicurati che l'audio parta quando la pagina è caricata
window.addEventListener('load', function() {
    bckAudio.play().catch(function(error) {
        console.log('Errore nella riproduzione dell\'audio di background:', error);
    });
});

// Aggiungi un listener per il termine della riproduzione
bckAudio.addEventListener('ended', function() {
    // Riparte l'audio quando finisce
    bckAudio.currentTime = 0; // Torna all'inizio
    bckAudio.play().catch(function(error) {
        console.log('Errore nella riproduzione dell\'audio di background:', error);
    });
});

// ------------------- SCROLL SOUND ------------------- //

// Crea oggetti Audio per lo scroll a 300px e 700px
const scrollSounds = {
    300: new Audio('audio/bassWS.mp3'), // Assicurati che il percorso sia corretto
    1500: new Audio('audio/arpWS.mp3')  // Nuovo suono per 700px
};

scrollSounds[300].loop = true;
scrollSounds[300].volume = 0.5;

scrollSounds[1500].loop = true;
scrollSounds[1500].volume = 0.5;

// Variabili per tenere traccia dello stato dei suoni di scroll
let hasPlayedScrollSound300 = false;
let hasPlayedScrollSound1500 = false;

// Funzione per gestire il fade-out dei suoni di scroll
function fadeOutScrollSound(threshold) {
    const fadeOutInterval = setInterval(function() {
        if (scrollSounds[threshold].volume > 0.0) {
            // Riduci il volume in modo lineare
            scrollSounds[threshold].volume = Math.max(0, scrollSounds[threshold].volume - 0.05);
        } else {
            // Quando il volume raggiunge zero, ferma il suono
            clearInterval(fadeOutInterval);
            scrollSounds[threshold].pause();
            scrollSounds[threshold].currentTime = 0; // Torna all'inizio
            scrollSounds[threshold].volume = 0.5; // Reset del volume per future riproduzioni
            if (threshold === 300) {
                hasPlayedScrollSound300 = false;
            } else if (threshold === 1500) {
                hasPlayedScrollSound1500 = false;
            }
        }
    }, 200); // Intervallo in millisecondi (puoi regolare la velocità del fade-out)
}

// Event listener per lo scroll
window.addEventListener('scroll', function() {
    const currentScroll = window.pageYOffset || document.documentElement.scrollTop;

    // stampa px scrollati
    //console.log(currentScroll);
    // Gestione suono a 300px
    if (currentScroll > 300) {
        if (!hasPlayedScrollSound300) {
            scrollSounds[300].play().catch(function(error) {
                console.log('Errore nella riproduzione dell\'audio di scroll a 300px:', error);
            });
            hasPlayedScrollSound300 = true; // Imposta a true per evitare che il suono venga riprodotto più volte
        }
    } else {
        if (hasPlayedScrollSound300) {
            fadeOutScrollSound(300);
        }
    }

    // Gestione suono a 700px
    if (currentScroll > 1500) {
        if (!hasPlayedScrollSound1500) {
            scrollSounds[1500].play().catch(function(error) {
                console.log('Errore nella riproduzione dell\'audio di scroll a 1500px:', error);
            });
            hasPlayedScrollSound1500 = true; // Imposta a true per evitare che il suono venga riprodotto più volte
        }
    } else {
        if (hasPlayedScrollSound1500) {
            fadeOutScrollSound(1500);
        }
    }
});
