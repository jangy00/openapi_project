//UI 상호작용 및 이벤트 처리

// 슬라이더 버튼 초기화
function initSlider(sliderElement) {
  const viewport = sliderElement.querySelector('.slider-viewport');
  const slides = sliderElement.querySelector('.hero-slides, .poster-slides');
  const prevBtn = sliderElement.querySelector('.slider-btn.prev');
  const nextBtn = sliderElement.querySelector('.slider-btn.next');
  
  if (!viewport || !slides || !prevBtn || !nextBtn) return;
  
  // 히어로 슬라이더 체크
  const isHeroSlider = slides.classList.contains('hero-slides');
  
  if (isHeroSlider) {
    let currentIndex = 0;
    const totalSlides = slides.children.length;
    
    function updateSlide() {
      const slideWidth = viewport.clientWidth;
      viewport.scrollLeft = currentIndex * slideWidth;
    }
    
    prevBtn.addEventListener('click', () => {
      if (currentIndex > 0) {
        currentIndex--;
        updateSlide();
      } else {
        currentIndex = totalSlides - 1;
        updateSlide();
      }
    });
    
    nextBtn.addEventListener('click', () => {
      if (currentIndex < totalSlides - 1) {
        currentIndex++;
        updateSlide();
      } else {
        currentIndex = 0;
        updateSlide();
      }
    });
    
    // 자동 슬라이드 (8초마다)
    let autoSlide = setInterval(() => {
      currentIndex = (currentIndex + 1) % totalSlides;
      updateSlide();
    }, 8000);

    // 마우스 오버시 자동 슬라이드 중지
    sliderElement.addEventListener('mouseenter', () => clearInterval(autoSlide));
    sliderElement.addEventListener('mouseleave', () => {
      autoSlide = setInterval(() => {
        currentIndex = (currentIndex + 1) % totalSlides;
        updateSlide();
      }, 8000);
    });
    
    // 윈도우 리사이즈 시 슬라이드 위치 재조정
    window.addEventListener('resize', updateSlide);
    
  } else {
    const cards = slides.querySelectorAll('.movie-poster-card');
    if (cards.length === 0) return;
    
    const cardWidth = cards[0].offsetWidth + 12; // gap 포함
    const scrollAmount = cardWidth * 3; // 3개씩 스크롤
    
    prevBtn.addEventListener('click', () => {
      viewport.scrollLeft = Math.max(0, viewport.scrollLeft - scrollAmount);
    });
    
    nextBtn.addEventListener('click', () => {
      viewport.scrollLeft = Math.min(
        viewport.scrollWidth - viewport.clientWidth,
        viewport.scrollLeft + scrollAmount
      );
    });
  }
}

// 검색 기능
function initSearchFunction() {
  document.getElementById('searchForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const query = document.getElementById('searchInput').value.trim();
    if (query) {
      const trendingSlides = document.getElementById('trendingSlides');
      trendingSlides.innerHTML = '<div class="loading">🔍 검색 중...</div>';
      
      const movies = await fetchMovies('/search/movie', { 
        query,
        'region': 'KR'
      });
      
      if (movies.length > 0) {
        const filteredMovies = movies.filter(movie => 
          movie.poster_path && movie.adult === false
        );
        
        if (filteredMovies.length > 0) {
          trendingSlides.innerHTML = filteredMovies
            .map(movie => createPosterCard(movie))
            .join('');
        } else {
          trendingSlides.innerHTML = '<div class="error">검색 결과가 없습니다 😔</div>';
        }
      } else {
        trendingSlides.innerHTML = '<div class="error">검색 결과가 없습니다 😔</div>';
      }
      
      // 슬라이더 버튼 재초기화
      setTimeout(() => {
        const slider = document.getElementById('trendingSlider');
        initSlider(slider);
      }, 100);
    }
  });
}

// 카테고리 필터 기능
function initCategoryFilter() {
  document.querySelectorAll('.chip').forEach(chip => {
    chip.addEventListener('click', async (e) => {
      e.preventDefault();
      
      // 활성 상태 업데이트
      document.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      
      const category = chip.dataset.category;
      
      // 트렌딩 슬라이더 업데이트
      await loadSlider('trendingSlides', category, false);
      
      // 슬라이더 버튼 재초기화
      setTimeout(() => {
        const slider = document.getElementById('trendingSlider');
        initSlider(slider);
      }, 100);
    });
  });
}

// 초기화 함수
async function init() {
  console.log('🎬 왓챠 클론 초기화 시작...');
  
  try {
    // API 키 테스트
    console.log('API 키 테스트 중...');
    const testMovies = await fetchMovies('/movie/popular');
    if (testMovies.length > 0) {
      console.log('API 키 정상 작동');
    } else {
      console.warn('API 응답이 비어있음');
    }
    
    // 히어로 슬라이더 - 한국 현재 상영작
    console.log('히어로 슬라이더 로드 중...');
    await loadSlider('heroSlides', 'now_playing', true);
    
    // 트렌딩 슬라이더
    console.log('트렌딩 슬라이더 로드 중...');
    await loadSlider('trendingSlides', 'trending', false);
    
    // 한국 영화 슬라이더
    console.log('🇰🇷 한국 영화 슬라이더 로드 중...');
    await loadSlider('koreanSlides', 'korean', false);
    
    // 슬라이더 버튼 초기화 (약간의 지연 후)
    setTimeout(() => {
      document.querySelectorAll('.slider').forEach(initSlider);
      console.log('모든 슬라이더 초기화 완료!');
    }, 1000);
    
    // 검색 기능 초기화
    initSearchFunction();
    
    // 카테고리 필터 초기화
    initCategoryFilter();
    
  } catch (error) {
    console.error('초기화 실패:', error);
  }
}

// DOM 로드 완료 시 실행
document.addEventListener('DOMContentLoaded', init);