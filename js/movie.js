// movie.js - API 처리 및 데이터 로딩

// MY API
const API_KEY = '17a4bb5f06898610d5c57f854cdbc5b0';
const BASE_URL = 'https://api.themoviedb.org/3';
const IMAGE_BASE_URL = 'https://image.tmdb.org/t/p';

// API 요청 함수
async function fetchMovies(endpoint, params = {}) {
  try {
    const url = new URL(`${BASE_URL}${endpoint}`);
    url.searchParams.set('api_key', API_KEY);
    url.searchParams.set('language', 'ko-KR');
    url.searchParams.set('region', 'KR');
    
    // 추가 파라미터 설정
    Object.keys(params).forEach(key => {
      url.searchParams.set(key, params[key]);
    });
    
    console.log('🎬 API 요청:', url.toString());
    
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    console.log(`✅ 영화 ${data.results?.length || 0}개 로드 완료`);
    
    return data.results || [];
  } catch (error) {
    console.error('❌ API 요청 실패:', error);
    return [];
  }
}

// 한국 현재 상영작
async function fetchKoreanNowPlaying() {
  try {
    console.log('🇰🇷 한국 현재 상영작 검색 시작...');
    
    const nowPlaying = await fetchMovies('/movie/now_playing', {
      'region': 'KR'
    });
    
    // 19금 제외 필터링 및 높은 평점순 정렬
    const filteredMovies = nowPlaying
      .filter(movie => {
        return movie.poster_path && 
               movie.vote_average > 0 &&
               movie.adult === false;
      })
      .sort((a, b) => b.vote_average - a.vote_average);
    
    console.log(`🇰🇷 한국 상영작 ${filteredMovies.length}개 발견`);
    return filteredMovies.slice(0, 10);
    
  } catch (error) {
    console.error('❌ 한국 상영작 검색 실패:', error);
    return [];
  }
}

// 한국 영화 검색 개선 (19금 제외, 관객수 높은 순)
async function fetchKoreanMovies() {
  try {
    console.log('🇰🇷 한국 영화 검색 시작...');
    
    // 한국어 원어 영화 검색 (인기순)
    const koreanOriginal = await fetchMovies('/discover/movie', {
      'with_original_language': 'ko',
      'sort_by': 'popularity.desc',
      'vote_count.gte': 50,
      'region': 'KR'
    });
    
    // 한국 영화 키워드 검색
    const searchQueries = ['기생충', '오징어게임', '설국열차', '부산행', '올드보이', '극한직업', '신과함께', '타짜', '베테랑', '명량', '아가씨', '악마를 보았다', '곡성', '밀정', '국제시장'];
    let searchResults = [];
    
    for (const query of searchQueries) {
      const movies = await fetchMovies('/search/movie', { 
        query,
        'region': 'KR'
      });
      searchResults = searchResults.concat(movies.slice(0, 3)); // 각 쿼리당 최대 3개만
    }
    
    // 모든 결과 합치기
    const allMovies = [...koreanOriginal, ...searchResults];
    
    // 중복 제거 및 필터링 
    const uniqueMovies = allMovies
      .filter((movie, index, self) =>
        index === self.findIndex(m => m.id === movie.id) &&
        movie.poster_path &&
        movie.vote_average > 0 &&
        movie.adult === false
      )
      .sort((a, b) => b.popularity - a.popularity)
      .slice(0, 20);
    
    console.log(`🇰🇷 한국 영화 ${uniqueMovies.length}개 발견`);
    return uniqueMovies;
    
  } catch (error) {
    console.error('❌ 한국 영화 검색 실패:', error);
    return [];
  }
}

// 국가 플래그 가져오기
function getCountryFlag(movie) {
  if (movie.original_language === 'ko') return '🇰🇷';
  if (movie.original_language === 'en') return '🇺🇸';
  if (movie.original_language === 'ja') return '🇯🇵';
  if (movie.original_language === 'zh') return '🇨🇳';
  if (movie.original_language === 'fr') return '🇫🇷';
  return '🌍';
}

// 히어로 슬라이드 생성
function createHeroSlide(movie) {
  const backdropUrl = movie.backdrop_path 
    ? `${IMAGE_BASE_URL}/w1280${movie.backdrop_path}`
    : (movie.poster_path 
      ? `${IMAGE_BASE_URL}/w1280${movie.poster_path}`
      : 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTI4MCIgaGVpZ2h0PSI3MjAiIHZpZXdCb3g9IjAgMCAxMjgwIDcyMCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjEyODAiIGhlaWdodD0iNzIwIiBmaWxsPSIjMWQxZDFkIi8+Cjx0ZXh0IHg9IjY0MCIgeT0iMzYwIiBmaWxsPSIjYmRiZGJkIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmb250LXNpemU9IjI0IiBmb250LXdlaWdodD0iYm9sZCI+Tm8gSW1hZ2U8L3RleHQ+Cjwvc3ZnPgo=');
  
  const year = movie.release_date ? new Date(movie.release_date).getFullYear() : '';
  const country = getCountryFlag(movie);
  const rating = movie.vote_average ? movie.vote_average.toFixed(1) : 'N/A';
  
  return `
    <div class="hero-slide">
      <img src="${backdropUrl}" alt="${movie.title}" class="hero-bg" onerror="this.src='data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTI4MCIgaGVpZ2h0PSI3MjAiIHZpZXdCb3g9IjAgMCAxMjgwIDcyMCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjEyODAiIGhlaWdodD0iNzIwIiBmaWxsPSIjMWQxZDFkIi8+Cjx0ZXh0IHg9IjY0MCIgeT0iMzYwIiBmaWxsPSIjYmRiZGJkIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmb250LXNpemU9IjI0IiBmb250LXdlaWdodD0iYm9sZCI+Tm8gSW1hZ2U8L3RleHQ+Cjwvc3ZnPgo='">
      <div class="hero-overlay">
        <div class="hero-meta">
          <span class="hero-country">${country}</span>
          <span class="hero-year">${year}</span>
          <span class="hero-genre">⭐ ${rating}</span>
        </div>
        <div class="hero-title">${movie.title}</div>
        <div class="hero-overview">${movie.overview || '줄거리 정보가 없습니다.'}</div>
      </div>
    </div>
  `;
}

// 포스터 카드 생성 (224x332)
function createPosterCard(movie) {
  const posterUrl = movie.poster_path 
    ? `${IMAGE_BASE_URL}/w500${movie.poster_path}`
    : 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjI0IiBoZWlnaHQ9IjMzMiIgdmlld0JveD0iMCAwIDIyNCAzMzIiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIyMjQiIGhlaWdodD0iMzMyIiBmaWxsPSIjMWQxZDFkIiBzdHJva2U9IiMzYTNhM2EiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWRhc2hhcnJheT0iNSw1Ii8+Cjx0ZXh0IHg9IjExMiIgeT0iMTY2IiBmaWxsPSIjYmRiZGJkIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmb250LXNpemU9IjE0IiBmb250LXdlaWdodD0iYm9sZCI+Tm8gSW1hZ2U8L3RleHQ+Cjwvc3ZnPgo=';
  
  const year = movie.release_date ? new Date(movie.release_date).getFullYear() : '';
  const rating = movie.vote_average ? movie.vote_average.toFixed(1) : 'N/A';
  const country = getCountryFlag(movie);
  
  return `
    <div class="movie-poster-card">
      <img src="${posterUrl}" alt="${movie.title}" class="movie-poster-img" onerror="this.src='data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjI0IiBoZWlnaHQ9IjMzMiIgdmlld0JveD0iMCAwIDIyNCAzMzIiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIyMjQiIGhlaWdodD0iMzMyIiBmaWxsPSIjMWQxZDFkIiBzdHJva2U9IiMzYTNhM2EiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWRhc2hhcnJheT0iNSw1Ii8+Cjx0ZXh0IHg9IjExMiIgeT0iMTY2IiBmaWxsPSIjYmRiZGJkIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmb250LXNpemU9IjE0IiBmb250LXdlaWdodD0iYm9sZCI+Tm8gSW1hZ2U8L3RleHQ+Cjwvc3ZnPgo='">
      <div class="movie-poster-rating">⭐ ${rating}</div>
      <div class="movie-poster-info">
        <div class="movie-poster-title">${movie.title}</div>
        <div class="movie-poster-meta">
          <span class="movie-poster-year">${year}</span>
          <span class="movie-poster-country">${country}</span>
        </div>
      </div>
    </div>
  `;
}

// 슬라이더 로드
async function loadSlider(sliderId, dataType, isHero = false) {
  const slidesContainer = document.getElementById(sliderId);
  let movies = [];

  try {
    switch(dataType) {
      case 'trending':
        movies = await fetchMovies('/trending/movie/day', {
          'region': 'KR'
        });
        // 19금 제외
        movies = movies.filter(movie => movie.adult === false);
        break;
      case 'korean':
        movies = await fetchKoreanMovies();
        break;
      case 'popular':
        movies = await fetchMovies('/movie/popular', {
          'region': 'KR'
        });
        movies = movies.filter(movie => movie.adult === false);
        break;
      case 'now_playing':
        movies = await fetchKoreanNowPlaying();
        break;
      default:
        movies = await fetchKoreanNowPlaying();
    }

    if (movies.length === 0) {
      slidesContainer.innerHTML = '<div class="error">영화를 불러올 수 없습니다 😢</div>';
      return;
    }

    if (isHero) {
      slidesContainer.innerHTML = movies.slice(0, 5)
        .map(movie => createHeroSlide(movie))
        .join('');
    } else {
      slidesContainer.innerHTML = movies
        .filter(movie => movie.poster_path) // 포스터 있는 것만
        .map(movie => createPosterCard(movie))
        .join('');
    }
    
  } catch (error) {
    console.error(`❌ ${sliderId} 로드 실패:`, error);
    slidesContainer.innerHTML = '<div class="error">로딩 중 오류가 발생했습니다</div>';
  }
}