// ui.simple.js — UI 상호작용/이벤트

// 서브 페이지 이동
function navigateToMovieDetail(movieId) {
  if (!movieId) return;
  window.location.href = `sub_page/index.html?id=${movieId}`;
}

// 슬라이더 초기화(히어로/포스터 공용)
function initSlider(sliderEl) {
  if (!sliderEl) return;
  const viewport = sliderEl.querySelector('.slider-viewport');
  const slides   = sliderEl.querySelector('.hero-slides, .poster-slides');
  const prevBtn  = sliderEl.querySelector('.slider-btn.prev');
  const nextBtn  = sliderEl.querySelector('.slider-btn.next');

  const isHero = slides && slides.classList.contains('hero-slides');

  // 히어로 슬라이더
  if (isHero && viewport && slides) {
    let idx = 0;
    const total = slides.children.length || 0;

    const updateSlide = () => {
      const w = viewport.clientWidth || 0;
      viewport.scrollLeft = idx * w;
      if (total > 0) updatePreview((idx + 1) % total);
    };

    const goPrev = () => { 
      idx = idx > 0 ? idx - 1 : total - 1; 
      updateSlide(); 
    };
    
    const goNext = () => { 
      idx = (idx + 1) % total; 
      updateSlide(); 
    };

    // 뒤로 가기 버튼 연결
    if (prevBtn) prevBtn.addEventListener('click', goPrev);

    // 프리뷰 클릭 시 다음 슬라이드
    const previewArticle = document.getElementById('previewArticle');
    if (previewArticle) previewArticle.addEventListener('click', goNext);

    // 슬라이드 클릭 → 상세 페이지
    slides.addEventListener('click', (e) => {
      const el = e.target.closest('.hero-slide');
      if (el?.dataset.movieId) navigateToMovieDetail(el.dataset.movieId);
    });

    // 스크롤 스냅 기능 추가
    let scrollTimeout;
    viewport.addEventListener('scroll', () => {
      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(() => {
        const currentScroll = viewport.scrollLeft;
        const slideWidth = viewport.clientWidth;
        const newIndex = Math.round(currentScroll / slideWidth);
        
        if (newIndex !== idx) {
          idx = Math.max(0, Math.min(newIndex, total - 1));
          updateSlide();
        }
      }, 150);
    });

    // 자동 넘김(8초) + 호버 시 일시정지
    let timer = setInterval(goNext, 8000);
    sliderEl.addEventListener('mouseenter', () => clearInterval(timer));
    sliderEl.addEventListener('mouseleave', () => { timer = setInterval(goNext, 8000); });

    // 창 크기 변경 시 위치 재계산
    window.addEventListener('resize', updateSlide);

    // 초기 위치/프리뷰 설정
    setTimeout(updateSlide, 100);
    return;
  }

  // 포스터 슬라이더 (기존 로직 유지)
  if (!viewport || !slides || !prevBtn || !nextBtn) return;
  
  const cards = slides.querySelectorAll('.movie-poster-card');
  if (!cards.length) return;

  const cardGap = 12;
  const cardWidth = (cards[0].offsetWidth || 0) + cardGap;
  const scrollAmount = cardWidth * 5; // 5장씩 이동

  prevBtn.addEventListener('click', () => {
    viewport.scrollLeft = Math.max(0, viewport.scrollLeft - scrollAmount);
  });

  nextBtn.addEventListener('click', () => {
    const max = viewport.scrollWidth - viewport.clientWidth;
    viewport.scrollLeft = Math.min(max, viewport.scrollLeft + scrollAmount);
  });

  // 카드 클릭 → 상세 페이지
  slides.addEventListener('click', (e) => {
    const card = e.target.closest('.movie-poster-card');
    if (card?.dataset.movieId) navigateToMovieDetail(card.dataset.movieId);
  });
}

// 히어로 프리뷰(포스터만) 업데이트
function updatePreview(nextIndex) {
  if (!Array.isArray(heroMovies) || !heroMovies.length) return;
  const m = heroMovies[nextIndex];
  if (!m) return;
  const el = document.getElementById('previewPoster');
  if (!el) return;

  el.src = m.poster_path
    ? `${IMAGE_BASE_URL}/w500${m.poster_path}`
    : 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjQ1MCIgdmlld0JveD0iMCAwIDMwMCA0NTAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIzMDAiIGhlaWdodD0iNDUwIiBmaWxsPSIjMWQxZDFkIi8+Cjx0ZXh0IHg9IjE1MCIgeT0iMjI1IiBmaWxsPSIjYmRiZGJkIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmb250LXNpemU9IjE2IiBmb250LXdlaWdodD0iYm9sZCI+Tm8gSW1hZ2U8L3RleHQ+Cjwvc3ZnPgo=';
  el.alt = m.title || '';
}

// 검색
function initSearchFunction() {
  const form = document.getElementById('searchForm');
  const input = document.getElementById('searchInput');
  const slides = document.getElementById('trendingSlides');
  if (!form || !input || !slides) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const q = input.value.trim();
    if (!q) return;

    slides.innerHTML = '<div class="loading">🔍 검색 중...</div>';
    const movies = await fetchMovies('/search/movie', { query: q, region: 'KR' });
    const list = (movies || []).filter(m => m.poster_path && m.adult === false).slice(0, 10);

    slides.innerHTML = list.length
      ? list.map(createPosterCard).join('')
      : '<div class="error">검색 결과가 없습니다 😔</div>';

    // 버튼 재바인딩
    setTimeout(() => {
      const slider = document.getElementById('trendingSlider');
      if (slider) initSlider(slider);
    }, 100);
  });
}

// 카테고리(칩) 필터
function initCategoryFilter() {
  const chips = document.querySelectorAll('.chip');
  if (!chips.length) return;

  chips.forEach(chip => {
    chip.addEventListener('click', async (e) => {
      e.preventDefault();
      chips.forEach(c => c.classList.remove('active'));
      chip.classList.add('active');

      const category = chip.dataset.category || 'trending';
      await loadSlider('trendingSlides', category, false);

      setTimeout(() => {
        const slider = document.getElementById('trendingSlider');
        if (slider) initSlider(slider);
      }, 100);
    });
  });
}

// URL의 ?search= 처리
function handleURLSearch() {
  const params = new URLSearchParams(window.location.search);
  const q = params.get('search');
  if (!q) return;

  const input = document.getElementById('searchInput');
  const form  = document.getElementById('searchForm');
  if (input && form) {
    input.value = q;
    form.dispatchEvent(new Event('submit'));
  }
  // 주소창 정리
  window.history.replaceState({}, document.title, window.location.pathname);
}

// 초기화: 메인 슬라이더(지정 영화), 트렌딩, 한국영화 로드 → 슬라이더 바인딩 → 검색/필터/URL검색
async function init() {
  try {
    await loadSlider('heroSlides',     'main_slider', true);
    await loadSlider('trendingSlides', 'trending',    false);
    await loadSlider('koreanSlides',   'korean',      false);

    // 모든 슬라이더 버튼 바인딩(콘텐츠 렌더 후)
    setTimeout(() => {
      document.querySelectorAll('.slider').forEach(initSlider);
    }, 1500);

    initSearchFunction();
    initCategoryFilter();
    handleURLSearch();
  } catch (err) {
    console.error('초기화 실패:', err);
    const hero = document.getElementById('heroSlides');
    if (hero) hero.innerHTML = '<div class="error">영화 데이터를 불러오는 중 문제가 발생했습니다.</div>';
  }
}

document.addEventListener('DOMContentLoaded', init);