/* Easy Tattoo — efeitos visuais e interatividade */
(() => {
	'use strict';

	/* ---------- fundo de pixels neon (reage ao mouse e clique) ---------- */
	function initPixelFX() {
		const canvas = document.getElementById('bg-fx');
		if (!canvas || !canvas.getContext) return;
		const ctx = canvas.getContext('2d');
		const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

		const SPACING = 24;
		const DOT_SIZE = 1.5;
		const CURSOR_RADIUS = 150;
		const RIPPLE_SPEED = 650;
		const RIPPLE_MAX_AGE = 1500;
		const RIPPLE_BAND = 40;
		const COLORS = ['255,47,196', '157,255,46', '255,90,60']; // pink, green, red

		let dpr = Math.min(window.devicePixelRatio || 1, 1.75);
		let w = 0, h = 0;
		let mouseX = -9999, mouseY = -9999;
		let hasMouse = false;
		let lastMoveRipple = 0;
		let ripples = [];
		let running = true;
		let rafId = null;

		function resize() {
			w = window.innerWidth;
			h = window.innerHeight;
			canvas.width = Math.floor(w * dpr);
			canvas.height = Math.floor(h * dpr);
			canvas.style.width = w + 'px';
			canvas.style.height = h + 'px';
			ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
		}

		function addRipple(x, y) {
			const color = COLORS[Math.floor(Math.random() * COLORS.length)];
			ripples.push({ x, y, t0: performance.now(), color });
			if (ripples.length > 6) ripples.shift();
		}

		function draw(now) {
			ctx.clearRect(0, 0, w, h);
			ripples = ripples.filter(r => now - r.t0 < RIPPLE_MAX_AGE);

			const cols = Math.ceil(w / SPACING) + 1;
			const rows = Math.ceil(h / SPACING) + 1;

			for (let iy = 0; iy < rows; iy++) {
				const y = iy * SPACING;
				for (let ix = 0; ix < cols; ix++) {
					const x = ix * SPACING;
					let boost = 0;
					let color = '255,47,196';

					if (hasMouse) {
						const d = Math.hypot(x - mouseX, y - mouseY);
						if (d < CURSOR_RADIUS) { boost = Math.max(boost, 1 - d / CURSOR_RADIUS); }
					}

					for (const r of ripples) {
						const age = now - r.t0;
						const radius = (age / 1000) * RIPPLE_SPEED;
						const d = Math.hypot(x - r.x, y - r.y);
						const band = Math.abs(d - radius);
						if (band < RIPPLE_BAND) {
							const fade = 1 - age / RIPPLE_MAX_AGE;
							const b = (1 - band / RIPPLE_BAND) * fade;
							if (b > boost) { boost = b; color = r.color; }
						}
					}

					const alpha = 0.10 + boost * 0.7;
					const size = DOT_SIZE + boost * 2.4;
					ctx.fillStyle = boost > 0.05 ? `rgba(${color},${alpha.toFixed(3)})` : `rgba(120,90,105,${alpha.toFixed(3)})`;
					ctx.fillRect(x - size / 2, y - size / 2, size, size);
				}
			}
			if (running) rafId = requestAnimationFrame(draw);
		}

		resize();
		draw(performance.now());
		if (reduceMotion) return;

		rafId = requestAnimationFrame(draw);
		window.addEventListener('resize', resize);
		window.addEventListener('pointermove', (e) => {
			mouseX = e.clientX; mouseY = e.clientY; hasMouse = true;
			const now = performance.now();
			if (now - lastMoveRipple > 280) { lastMoveRipple = now; addRipple(mouseX, mouseY); }
		}, { passive: true });
		window.addEventListener('pointerleave', () => { hasMouse = false; });
		window.addEventListener('pointerdown', (e) => addRipple(e.clientX, e.clientY), { passive: true });
		document.addEventListener('visibilitychange', () => {
			running = !document.hidden;
			if (running) rafId = requestAnimationFrame(draw);
			else if (rafId) cancelAnimationFrame(rafId);
		});
	}

	/* ---------- menu mobile ---------- */
	function initNav() {
		const toggle = document.getElementById('nav-toggle');
		const links = document.getElementById('nav-links');
		if (!toggle || !links) return;
		toggle.addEventListener('click', () => links.classList.toggle('open'));
		links.querySelectorAll('a').forEach(a => a.addEventListener('click', () => links.classList.remove('open')));
	}

	/* ---------- scroll reveal ---------- */
	function initReveal() {
		const els = document.querySelectorAll('.reveal');
		if (!('IntersectionObserver' in window)) {
			els.forEach(el => el.classList.add('in'));
			return;
		}
		const io = new IntersectionObserver((entries) => {
			entries.forEach(entry => {
				if (entry.isIntersecting) {
					entry.target.classList.add('in');
					io.unobserve(entry.target);
				}
			});
		}, { threshold: 0.15 });
		els.forEach(el => io.observe(el));
	}

	/* ---------- lightbox da galeria ---------- */
	function initLightbox() {
		const lightbox = document.getElementById('lightbox');
		const lightboxImg = document.getElementById('lightbox-img');
		if (!lightbox || !lightboxImg) return;
		document.querySelectorAll('.flash-card img').forEach(img => {
			img.addEventListener('click', () => {
				lightboxImg.src = img.src;
				lightbox.classList.add('open');
			});
		});
		document.getElementById('lightbox-close').addEventListener('click', () => lightbox.classList.remove('open'));
		lightbox.addEventListener('click', (e) => { if (e.target === lightbox) lightbox.classList.remove('open'); });
		document.addEventListener('keydown', (e) => { if (e.key === 'Escape') lightbox.classList.remove('open'); });
	}

	/* ---------- música de fundo (YouTube) ----------
	   Navegadores bloqueiam áudio com som automático sem interação do
	   usuário (política de todos os browsers modernos, mobile e desktop —
	   não dá pra contornar isso via código). A gente faz o melhor possível:
	   1) tenta autoplay direto (funciona em alguns casos/navegadores);
	   2) qualquer primeiro toque/clique na página já liga o som sozinho;
	   3) o botão flutuante deixa ligar/desligar manualmente a qualquer hora. */
	function initMusic() {
		const YT_VIDEO_ID = '5qm8PH4xAss';
		const btn = document.getElementById('music-toggle');
		const container = document.getElementById('yt-player');
		if (!btn || !container || !window.location.protocol.startsWith('http')) {
			if (btn) btn.style.display = 'none';
			return;
		}

		let player = null;
		let ready = false;
		let wantsPlaying = false;

		function setBtnState(playing) {
			wantsPlaying = playing;
			btn.classList.toggle('playing', playing);
			btn.textContent = playing ? '🔊' : '🔇';
			btn.setAttribute('aria-label', playing ? 'Desativar som' : 'Ativar som');
		}

		function tryStart() {
			if (!ready || !player) return;
			try {
				player.unMute();
				player.playVideo();
				setBtnState(true);
			} catch (e) {}
		}

		window.onYouTubeIframeAPIReady = function () {
			player = new YT.Player('yt-player', {
				videoId: YT_VIDEO_ID,
				playerVars: {
					autoplay: 1, mute: 1, loop: 1, playlist: YT_VIDEO_ID,
					controls: 0, disablekb: 1, fs: 0, modestbranding: 1, playsinline: 1,
				},
				events: {
					onReady: (e) => {
						ready = true;
						e.target.playVideo();
						// tenta com som direto; se o navegador bloquear, continua
						// mudo até a primeira interação (ver listener abaixo).
						tryStart();
					},
					onStateChange: (e) => {
						if (e.data === YT.PlayerState.PLAYING) setBtnState(!player.isMuted());
						if (e.data === YT.PlayerState.PAUSED) btn.classList.remove('playing');
					},
				},
			});
		};

		const tag = document.createElement('script');
		tag.src = 'https://www.youtube.com/iframe_api';
		document.head.appendChild(tag);

		// primeira interação em QUALQUER lugar da página já liga o som
		const firstInteraction = () => { tryStart(); };
		['pointerdown', 'keydown', 'touchstart'].forEach(evt =>
			document.addEventListener(evt, firstInteraction, { once: true, passive: true })
		);

		btn.addEventListener('click', () => {
			if (!ready) return;
			if (wantsPlaying) {
				player.pauseVideo();
				setBtnState(false);
			} else {
				tryStart();
			}
		});
	}

	document.addEventListener('DOMContentLoaded', () => {
		initPixelFX();
		initNav();
		initReveal();
		initLightbox();
		initMusic();
	});
})();
