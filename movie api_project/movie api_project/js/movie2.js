//UI 상호작용 및 이벤트 처리 (경로 수정됨)

// 서브 페이지로 이동하는 함수 - 현재 파일 구조에 맞게 수정
function navigateToMovieDetail(movieId) {
  window.location.href = `sub_index.html?id=${movieId}`;
}

// 미리보기 애니메이션 효과
function animatePreview() {
  const previewArticle = document.getElementById('previewArticle');
  if (previewArticle) {
    previewArticle.classList.add('page-flip');
    
    setTimeout(() => {
      previewArticle.classList.remove('page-flip');
    }, 600);
  }
}

// 슬라이더 버튼 초기화 (수정됨)
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
    let nextPreviewIndex = 1;
    const totalSlides = slides.children.length;
    
    if (totalSlides === 0) return;
    
    function updateSlide() {
      const slideWidth = viewport.clientWidth;
      viewport.scrollLeft = currentIndex * slideWidth;
      
      // 다음 미리보기 인덱스 업데이트
      nextPreviewIndex = (currentIndex + 1) % totalSlides;
      updatePreview(nextPreviewIndex);
    }
    
    // 미리보기를 독립적으로 업데이트하는 함수
    function updatePreviewOnly() {
      animatePreview();
      setTimeout(() => {
        nextPreviewIndex = (nextPreviewIndex + 1) % totalSlides;
        updatePreview(nextPreviewIndex);
      }, 300);
    }
    
    prevBtn.addEventListener('click', () => {
      if (currentIndex > 0) {
        currentIndex--;
      } else {
        currentIndex = totalSlides - 1;
      }
      updateSlide();
    });
    
    nextBtn.addEventListener('click', () => {
      currentIndex = (currentIndex + 1) % totalSlides;
      updateSlide();
    });
    
    // 미리보기 클릭 이벤트 - 미리보기만 변경 (메인 슬라이더는 그대로)
    const previewArticle = document.getElementById('previewArticle');
    if (previewArticle) {
      previewArticle.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        updatePreviewOnly();
      });
    }
    
    // 히어로 슬라이드 클릭 이벤트 추가 (상세 페이지로 이동)
    slides.addEventListener('click', (e) => {
      const heroSlide = e.target.closest('.hero-slide');
      if (heroSlide) {
        const movieId = heroSlide.dataset.movieId;
        if (movieId) {
          navigateToMovieDetail(movieId);
        }
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
    
    // 초기 미리보기 설정
    setTimeout(() => updateSlide(), 100);
    
  } else {
    const cards = slides.querySelectorAll('.movie-poster-card');
    if (cards.length === 0) return;
    
    const cardWidth = cards[0].offsetWidth + 12; // gap 포함
    const scrollAmount = cardWidth * 5; // 5개씩 스크롤 유지
    
    prevBtn.addEventListener('click', () => {
      viewport.scrollLeft = Math.max(0, viewport.scrollLeft - scrollAmount);
    });
    
    nextBtn.addEventListener('click', () => {
      viewport.scrollLeft = Math.min(
        viewport.scrollWidth - viewport.clientWidth,
        viewport.scrollLeft + scrollAmount
      );
    });
    
    // 포스터 카드 클릭 이벤트 추가 (상세 페이지로 이동)
    slides.addEventListener('click', (e) => {
      const posterCard = e.target.closest('.movie-poster-card');
      if (posterCard) {
        const movieId = posterCard.dataset.movieId;
        if (movieId) {
          navigateToMovieDetail(movieId);
        }
      }
    });
  }
}

// 검색 기능 (필터링 적용) - 수정됨
function initSearchFunction() {
  const searchForm = document.getElementById('searchForm');
  if (!searchForm) return;
  
  searchForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const query = document.getElementById('searchInput').value.trim();
    if (query) {
      const trendingSlides = document.getElementById('trendingSlides');
      if (!trendingSlides) return;
      
      trendingSlides.innerHTML = '<div class="loading">검색 중...</div>';
      
      try {
        console.log('검색 시작:', query);
        
        // 검색 API 호출 - 다중 페이지 검색으로 개선
        let allSearchResults = [];
        
        // 페이지 1-3까지 검색하여 더 많은 결과 확보
        for (let page = 1; page <= 3; page++) {
          try {
            const searchMovies = await fetchMovies('/search/movie', { 
              query,
              page: page,
              region: 'KR'
            });
            allSearchResults = [...allSearchResults, ...searchMovies];
          } catch (error) {
            console.warn(`검색 페이지 ${page} 실패:`, error);
          }
        }
        
        console.log(`검색 결과: ${allSearchResults.length}개 영화 발견`);
        
        if (allSearchResults.length > 0) {
          // 중복 제거
          const uniqueResults = allSearchResults.filter((movie, index, self) =>
            index === self.findIndex(m => m.id === movie.id)
          );
          
          // 필터링 적용 (한국, 미국, 일본 + 한국어 포스터)
          const filteredMovies = await filterMoviesWithKoreanPosters(uniqueResults, 15);
          
          if (filteredMovies.length > 0) {
            trendingSlides.innerHTML = filteredMovies
              .map(movie => createPosterCard(movie))
              .join('');
            
            console.log(`필터링된 검색 결과: ${filteredMovies.length}개 영화`);
          } else {
            trendingSlides.innerHTML = '<div class="error">조건에 맞는 검색 결과가 없습니다. (한국/미국/일본 영화만 지원)</div>';
          }
        } else {
          trendingSlides.innerHTML = '<div class="error">검색 결과가 없습니다</div>';
        }
        
      } catch (error) {
        console.error('검색 실패:', error);
        trendingSlides.innerHTML = '<div class="error">검색 중 오류가 발생했습니다</div>';
      }
      
      // 슬라이더 버튼 재초기화
      setTimeout(() => {
        const slider = document.getElementById('trendingSlider');
        if (slider) {
          initSlider(slider);
        }
      }, 100);
    }
  });
}

// 카테고리 필터 기능 (수정됨)
function initCategoryFilter() {
  document.querySelectorAll('.chip').forEach(chip => {
    chip.addEventListener('click', async (e) => {
      e.preventDefault();
      
      // 활성 상태 업데이트
      document.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      
      const category = chip.dataset.category;
      console.log('카테고리 변경:', category);
      
      // 트렌딩 슬라이더 업데이트 (필터링 적용)
      await loadSlider('trendingSlides', category, false);
      
      // 슬라이더 버튼 재초기화
      setTimeout(() => {
        const slider = document.getElementById('trendingSlider');
        if (slider) {
          initSlider(slider);
        }
      }, 100);
    });
  });
}

// URL에서 검색어 확인하고 처리하는 함수 (수정됨)
function handleURLSearch() {
  const urlParams = new URLSearchParams(window.location.search);
  const searchQuery = urlParams.get('search');
  
  if (searchQuery) {
    console.log('URL에서 검색어 발견:', searchQuery);
    
    // 검색어 입력 필드에 설정
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
      searchInput.value = decodeURIComponent(searchQuery);
      
      // 검색 실행 (약간의 지연 후)
      setTimeout(() => {
        const searchForm = document.getElementById('searchForm');
        if (searchForm) {
          const submitEvent = new Event('submit', { bubbles: true, cancelable: true });
          searchForm.dispatchEvent(submitEvent);
        }
      }, 1000);
    }
    
    // URL에서 검색 파라미터 제거 (브라우저 히스토리 깔끔하게 유지)
    window.history.replaceState({}, document.title, window.location.pathname);
  }
}

// 초기화 함수 (수정됨)
async function init() {
  console.log('=== 왓챠 클론 초기화 시작 ===');
  console.log('API_KEY 존재 여부:', !!API_KEY);
  console.log('BASE_URL:', BASE_URL);
  
  try {
    // API 키 테스트
    console.log('API 키 테스트 중...');
    const testResponse = await fetch(`${BASE_URL}/configuration?api_key=${API_KEY}`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json'
      }
    });
    
    if (testResponse.ok) {
      const testData = await testResponse.json();
      console.log('API 키 정상 작동', testData);
    } else {
      console.error('API 키 테스트 실패:', testResponse.status);
      return;
    }
    
    // 히어로 슬라이더 - 한국 현재 상영작 (필터링 적용)
    console.log('히어로 슬라이더 로드 중...');
    await loadSlider('heroSlides', 'now_playing', true);
    
    // 트렌딩 슬라이더 (필터링 적용)
    console.log('트렌딩 슬라이더 로드 중...');
    await loadSlider('trendingSlides', 'trending', false);
    
    // 한국 영화 슬라이더 (필터링 적용)
    console.log('한국 영화 슬라이더 로드 중...');
    await loadSlider('koreanSlides', 'korean', false);
    
    // 슬라이더 버튼 초기화 (약간의 지연 후)
    setTimeout(() => {
      const sliders = document.querySelectorAll('.slider');
      console.log(`${sliders.length}개 슬라이더 초기화 중...`);
      
      sliders.forEach((slider, index) => {
        try {
          initSlider(slider);
          console.log(`슬라이더 ${index + 1} 초기화 완료`);
        } catch (error) {
          console.warn(`슬라이더 ${index + 1} 초기화 실패:`, error);
        }
      });
      
      console.log('모든 슬라이더 초기화 완료!');
    }, 1500);
    
    // 검색 기능 초기화
    console.log('검색 기능 초기화 중...');
    initSearchFunction();
    
    // 카테고리 필터 초기화
    console.log('카테고리 필터 초기화 중...');
    initCategoryFilter();
    
    // URL 검색어 처리 (모든 초기화 후)
    setTimeout(() => {
      handleURLSearch();
    }, 2000);
    
    console.log('=== 초기화 완료! ===');
    
  } catch (error) {
    console.error('=== 초기화 실패 ===', error);
    
    // 사용자에게 에러 표시
    const errorElements = document.querySelectorAll('.loading');
    errorElements.forEach(el => {
      el.innerHTML = `<div class="error">로딩 중 오류가 발생했습니다: ${error.message}</div>`;
      el.className = 'error';
    });
  }
}

// DOM 로드 완료 시 실행
document.addEventListener('DOMContentLoaded', init);