const transitionAudio = new Audio('audio/holeTransition.mp3');

// Seleziona tutti i thumbnail
var thumbnails = document.querySelectorAll('.thumbnail');

// Seleziona l'elemento audio
var audioPlayer = document.getElementById('thumbnailAudio');

// Variabile per tenere traccia dell'intervallo del fade-out
var fadeOutInterval;


// Event listener per lo scroll rimane invariato
window.addEventListener('scroll', function() {
    var holeImageContainer = document.querySelector(".full-screen-hole");
    if (holeImageContainer) {
        var triggerPoint = holeImageContainer.offsetTop - window.innerHeight + 100;

        if (window.scrollY >= triggerPoint) {
            holeImageContainer.classList.add('visible');
        } else {
            holeImageContainer.classList.remove('visible');
        }
    }
});

// Event listener per il click sul thumbnail
thumbnails.forEach(function(thumbnail) {
    var audioSrc = thumbnail.getAttribute('data-audio');
    if (audioSrc) {
        thumbnail.addEventListener('mouseover', function() {
            // Cancella qualsiasi fade-out in corso
            clearInterval(fadeOutInterval);

            audioPlayer.src = audioSrc;
            audioPlayer.volume = 1.0; // Assicura che il volume sia al massimo
            audioPlayer.play().catch(function(error) {
                console.log('Errore nella riproduzione dell\'audio:', error);
            });
        });

        thumbnail.addEventListener('mouseout', function() {
            // Clear any ongoing fade-out
            clearInterval(fadeOutInterval);
        
            // Start the fade-out
            fadeOutInterval = setInterval(function() {
                if (audioPlayer.volume > 0.0) {
                    // Decrease the volume but ensure it doesn't go below 0
                    audioPlayer.volume = Math.max(0, audioPlayer.volume - 0.05);
                } else {
                    // When volume reaches zero, stop the audio
                    clearInterval(fadeOutInterval);
                    audioPlayer.pause();
                    audioPlayer.currentTime = 0;
                    audioPlayer.volume = 1.0; // Reset volume for next time
                }
            }, 40); // Interval in milliseconds (adjust for fade-out speed)
        });
    }
});



var holeButton = document.getElementById('holeButton');

// Event listener per il click sul bottone
if(holeButton){
    holeButton.addEventListener('click', function() {
        var holeImageContainer = document.querySelector(".full-screen-hole");
        transitionAudio.play().catch(function(error) {
            console.log('Errore nella riproduzione dell\'audio di transizione:', error);
        });
        // Aggiungi la classe per l'effetto di zoom-in
        holeImageContainer.classList.add('zoom-in');
        document.body.style.overflow = 'hidden'; // Rimuovi lo scroll
    
        // Dopo l'animazione, reindirizza l'utente
        setTimeout(function() {
            window.location.href = 'index2.html'; // Sostituisci con l'URL della tua pagina
        }, 5000); // 5000ms corrispondono alla durata dell'animazione CSS
    });
}


// Swiper --> serve per gestire l'album delle canzoni

console.log('Initializing Swiper...');
var albumSwiper = new Swiper('.album-swiper', {
    slidesPerView: 3, // Number of slides visible
    spaceBetween: 30, // Space between slides in px
    centeredSlides: true,
    loop: true,
    pagination: {
      el: '.albums .swiper-pagination',
      clickable: true,
      spaceBetween: 30,
    },
    /*navigation: {
      nextEl: '.albums .swiper-button-next',
      prevEl: '.albums .swiper-button-prev',
    },*/
  });
console.log('Swiper initialized:', albumSwiper);

// se ho bisogno di fare qualcosa quando clicco su una slide
document.querySelectorAll('.swiper-slide').forEach(slide => {
    slide.addEventListener('click', function(event) {
        //event.preventDefault(); // This will prevent the link from being followed
        // Your custom logic here
    });
});


// Wavesurfer --> serve per visualizzare l'onda sonora
const wavesurfer = WaveSurfer.create({
    container: '#waveform',   // Container for the waveform
    waveColor: '#ddd',        // Color of the waveform
    progressColor: '#000020', // Color of the progress bar
    height: 100,              // Height of the waveform
    hidesScrollbar: true,     // Hide the horizontal scrollbar
});

// Load your audio file
wavesurfer.load('/audio/alienSoundDesign.mp3'); // Replace with your audio file path

// Toggle play/pause on button click
const playPauseBtn = document.getElementById('playPauseBtn');
playPauseBtn.addEventListener('click', () => {
    wavesurfer.playPause();  // Play or pause the audio
    playPauseBtn.textContent = wavesurfer.isPlaying() ? 'Stop Imaging' : 'Start Imaging';
});

// Update the button text based on the playing state
wavesurfer.on('finish', () => {
    playPauseBtn.textContent = 'Start Imaging';
});

const shinyBtn = document.getElementById('shinyButton');
const shinyFX = new Audio('audio/shinySound.wav');
const shinyFXReverse = new Audio('audio/shinyFXRev.mp3');
const sonar = new Audio('audio/sonar.wav');



shinyBtn.addEventListener('click', function() {
    sonar.volume = 0.4;
    sonar.play();

    // crea effetto dissolvenzas
    document.body.classList.add('fade-out');

    // Dopo l'animazione, reindirizza l'utente
    setTimeout(function() {
        window.location.href = 'index3.html'; // Sostituisci con l'URL della tua pagina
    }, 5000); // 5000ms corrispondono alla durata dell'animazione CSS
});

shinyBtn.addEventListener('mouseover', function() {
    shinyFX.volume = 0.9;
    shinyFX.play(); 
    shinyFXReverse.volume = 0.0;
});

shinyBtn.addEventListener('mouseout', function() {
    shinyFXReverse.volume = 0.9;
    shinyFXReverse.play(); 
    shinyFX.volume = 0.0;
});

