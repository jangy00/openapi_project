// movie.js - API 처리 및 데이터 로딩 (수정됨 - 최신 영화 우선 필터링)

// TMDB API 설정
const API_KEY = '17a4bb5f06898610d5c57f854cdbc5b0';
const BASE_URL = 'https://api.themoviedb.org/3';
const IMAGE_BASE_URL = 'https://image.tmdb.org/t/p';

// 전역 변수
let heroMovies = [];
let currentHeroIndex = 0;

// 허용 국가 및 언어 목록 (한국, 미국, 일본만)
const ALLOWED_COUNTRIES = ['KR', 'US', 'JP'];
const ALLOWED_LANGUAGES = ['ko', 'en', 'ja'];

// 기본 API 요청 함수
async function fetchMovies(endpoint, params = {}) {
    try {
        const queryParams = new URLSearchParams({
            api_key: API_KEY,
            language: 'ko-KR',
            region: 'KR',
            ...params
        });
        
        const url = `${BASE_URL}${endpoint}?${queryParams}`;
        console.log('API 요청:', url);
        
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            throw new Error(`HTTP 오류: ${response.status}`);
        }
        
        const data = await response.json();
        console.log(`영화 ${data.results?.length || 0}개 로드 완료`);
        
        return data.results || [];
    } catch (error) {
        console.error('API 요청 실패:', error);
        return [];
    }
}

// 영화 기본 필터링 (성인물, 포스터, 국가 제한) - 최신 영화 우선
function basicMovieFilter(movies) {
    return movies.filter(movie => {
        // 1. 성인물 및 포스터 체크
        if (movie.adult === true || !movie.poster_path) return false;
        
        // 2. 2020년 이후 영화만 (더 최신 영화 우선)
        const releaseYear = movie.release_date ? new Date(movie.release_date).getFullYear() : 0;
        if (releaseYear < 2020) return false;
        
        // 3. 국가/언어 체크 (한국, 미국, 일본만)
        const originCountry = movie.origin_country?.[0] || movie.original_language;
        const originalLang = movie.original_language;
        
        return ALLOWED_COUNTRIES.includes(originCountry) || 
               ALLOWED_LANGUAGES.includes(originalLang);
    })
    // 4. 최신순으로 정렬 (2025년 > 2024년 > 2023년 순)
    .sort((a, b) => {
        const dateA = new Date(a.release_date || '1970-01-01');
        const dateB = new Date(b.release_date || '1970-01-01');
        return dateB - dateA; // 내림차순 정렬 (최신순)
    });
}

// 한국어 포스터 확인
async function checkKoreanPoster(movieId) {
    try {
        const response = await fetch(`${BASE_URL}/movie/${movieId}/images?api_key=${API_KEY}`);
        
        if (!response.ok) return true; // API 오류시 통과
        
        const data = await response.json();
        
        // 한국어 또는 null 언어 포스터 확인
        const hasKoreanPoster = data.posters?.some(poster => 
            poster.iso_639_1 === 'ko' || poster.iso_639_1 === null
        );
        
        return hasKoreanPoster || false;
    } catch (error) {
        console.warn(`포스터 확인 실패 (Movie ID: ${movieId}):`, error);
        return true; // 오류시 통과
    }
}

// 영화 리스트 필터링 (한국어 포스터 우선) - 최신 영화 우선
async function filterMoviesWithKoreanPosters(movies, maxCount = 10) {
    if (!movies || movies.length === 0) return [];
    
    console.log(`필터링 시작: ${movies.length}개 영화`);
    
    // 1단계: 기본 필터링 (최신순 정렬 포함)
    const basicFiltered = basicMovieFilter(movies);
    console.log(`기본 필터링 후: ${basicFiltered.length}개`);
    
    if (basicFiltered.length === 0) return [];
    
    // 2단계: 한국 영화 우선 선별 (최신순 유지)
    const koreanMovies = basicFiltered.filter(movie => 
        movie.original_language === 'ko' || movie.origin_country?.includes('KR')
    );
    
    // 3단계: 외국 영화는 한국어 포스터 확인 (최신순 유지)
    const foreignMovies = basicFiltered.filter(movie => 
        movie.original_language !== 'ko' && !movie.origin_country?.includes('KR')
    );
    
    const filteredForeignMovies = [];
    const checkLimit = Math.min(foreignMovies.length, 20); // 최대 20개만 체크
    
    for (let i = 0; i < checkLimit && (koreanMovies.length + filteredForeignMovies.length) < maxCount; i++) {
        const movie = foreignMovies[i];
        const hasKoreanPoster = await checkKoreanPoster(movie.id);
        
        if (hasKoreanPoster) {
            filteredForeignMovies.push(movie);
        }
    }
    
    // 4단계: 한국 영화 + 한국어 포스터 외국 영화 결합 (최신순 유지)
    const finalMovies = [...koreanMovies, ...filteredForeignMovies]
        .sort((a, b) => {
            const dateA = new Date(a.release_date || '1970-01-01');
            const dateB = new Date(b.release_date || '1970-01-01');
            return dateB - dateA; // 최신순 정렬
        })
        .slice(0, maxCount);
    
    console.log(`최종 필터링 후: ${finalMovies.length}개 (한국영화: ${koreanMovies.length}개, 외국영화: ${filteredForeignMovies.length}개)`);
    return finalMovies;
}

// 지역별 영화 검색 (최신 영화 우선)
async function fetchMoviesByRegion(region = 'KR') {
    try {
        console.log(`${region} 지역 영화 검색 시작`);
        
        let allMovies = [];
        
        // 2025년 최신 영화 우선 검색
        const movies2025 = await fetchMovies('/discover/movie', {
            region,
            'primary_release_date.gte': '2025-01-01',
            'primary_release_date.lte': '2025-12-31',
            sort_by: 'popularity.desc'
        });
        allMovies = [...allMovies, ...movies2025];
        
        // 2024년 영화
        const movies2024 = await fetchMovies('/discover/movie', {
            region,
            'primary_release_date.gte': '2024-01-01',
            'primary_release_date.lte': '2024-12-31',
            sort_by: 'popularity.desc'
        });
        allMovies = [...allMovies, ...movies2024];
        
        // 지역별 인기 영화
        const popularMovies = await fetchMovies('/movie/popular', { region });
        allMovies = [...allMovies, ...popularMovies];
        
        // 지역별 현재 상영작
        const nowPlayingMovies = await fetchMovies('/movie/now_playing', { region });
        allMovies = [...allMovies, ...nowPlayingMovies];
        
        // 중복 제거
        const uniqueMovies = allMovies.filter((movie, index, self) =>
            index === self.findIndex(m => m.id === movie.id)
        );
        
        // 필터링 적용
        return await filterMoviesWithKoreanPosters(uniqueMovies, 15);
        
    } catch (error) {
        console.error(`${region} 지역 영화 검색 실패:`, error);
        return [];
    }
}

// 한국 영화 검색 (최신 영화 우선)
async function fetchKoreanMovies() {
    try {
        console.log('한국 영화 검색 시작');
        
        let allKoreanMovies = [];
        
        // 2025년 한국 영화 우선
        const korean2025 = await fetchMovies('/discover/movie', {
            with_original_language: 'ko',
            'primary_release_date.gte': '2025-01-01',
            'primary_release_date.lte': '2025-12-31',
            sort_by: 'popularity.desc',
            region: 'KR'
        });
        allKoreanMovies = [...allKoreanMovies, ...korean2025];
        
        // 2024년 한국 영화
        const korean2024 = await fetchMovies('/discover/movie', {
            with_original_language: 'ko',
            'primary_release_date.gte': '2024-01-01',
            'primary_release_date.lte': '2024-12-31',
            sort_by: 'popularity.desc',
            region: 'KR'
        });
        allKoreanMovies = [...allKoreanMovies, ...korean2024];
        
        // 한국어 원어 영화 (최신순)
        const koreanOriginal = await fetchMovies('/discover/movie', {
            with_original_language: 'ko',
            'primary_release_date.gte': '2020-01-01',
            sort_by: 'release_date.desc',
            region: 'KR'
        });
        allKoreanMovies = [...allKoreanMovies, ...koreanOriginal];
        
        // 한국 제작 영화
        const koreanProduction = await fetchMovies('/discover/movie', {
            with_production_countries: 'KR',
            'primary_release_date.gte': '2020-01-01',
            sort_by: 'release_date.desc',
            region: 'KR'
        });
        allKoreanMovies = [...allKoreanMovies, ...koreanProduction];
        
        // 현재 상영 중인 한국 영화
        const nowPlayingKorean = await fetchMovies('/movie/now_playing', {
            region: 'KR'
        });
        const koreanNowPlaying = nowPlayingKorean.filter(movie => 
            movie.original_language === 'ko' || movie.origin_country?.includes('KR')
        );
        allKoreanMovies = [...allKoreanMovies, ...koreanNowPlaying];
        
        // 중복 제거 및 한국 영화만 필터링
        const uniqueKoreanMovies = allKoreanMovies
            .filter((movie, index, self) =>
                index === self.findIndex(m => m.id === movie.id) &&
                (movie.original_language === 'ko' || movie.origin_country?.includes('KR'))
            )
            .filter(movie => !movie.adult && movie.poster_path) // 성인물 및 포스터 체크
            .sort((a, b) => new Date(b.release_date || 0) - new Date(a.release_date || 0)) // 최신순
            .slice(0, 15);
        
        console.log(`한국 영화 ${uniqueKoreanMovies.length}개 발견`);
        return uniqueKoreanMovies;
        
    } catch (error) {
        console.error('한국 영화 검색 실패:', error);
        return [];
    }
}

// 트렌딩 영화 검색 (최신 영화 우선)
async function fetchTrendingMovies() {
    try {
        console.log('트렌딩 영화 검색 시작');
        
        let allTrendingMovies = [];
        
        // 2025년 최신 영화 우선
        const trending2025 = await fetchMovies('/discover/movie', {
            'primary_release_date.gte': '2025-01-01',
            'primary_release_date.lte': '2025-12-31',
            sort_by: 'popularity.desc'
        });
        allTrendingMovies = [...allTrendingMovies, ...trending2025];
        
        // 2024년 인기 영화
        const trending2024 = await fetchMovies('/discover/movie', {
            'primary_release_date.gte': '2024-01-01',
            'primary_release_date.lte': '2024-12-31',
            sort_by: 'popularity.desc'
        });
        allTrendingMovies = [...allTrendingMovies, ...trending2024];
        
        // 일간 트렌딩
        const dailyTrending = await fetchMovies('/trending/movie/day');
        allTrendingMovies = [...allTrendingMovies, ...dailyTrending];
        
        // 주간 트렌딩
        const weeklyTrending = await fetchMovies('/trending/movie/week');
        allTrendingMovies = [...allTrendingMovies, ...weeklyTrending];
        
        // 중복 제거
        const uniqueMovies = allTrendingMovies.filter((movie, index, self) =>
            index === self.findIndex(m => m.id === movie.id)
        );
        
        // 필터링 적용
        return await filterMoviesWithKoreanPosters(uniqueMovies, 15);
        
    } catch (error) {
        console.error('트렌딩 영화 검색 실패:', error);
        return [];
    }
}

// 국가 플래그 가져오기
function getCountryFlag(movie) {
    const originCountry = movie.origin_country?.[0] || movie.original_language;
    const originalLang = movie.original_language;
    
    if (originalLang === 'ko' || originCountry === 'KR') {
        return '<img src="https://flagcdn.com/16x12/kr.png" alt="KR" style="width:16px;height:12px;">';
    }
    if (originalLang === 'en' || originCountry === 'US') {
        return '<img src="https://flagcdn.com/16x12/us.png" alt="US" style="width:16px;height:12px;">';
    }
    if (originalLang === 'ja' || originCountry === 'JP') {
        return '<img src="https://flagcdn.com/16x12/jp.png" alt="JP" style="width:16px;height:12px;">';
    }
    
    return '🌐';
}

// 텍스트를 2줄로 제한하는 함수
function limitTextToTwoLines(text, maxLength = 120) {
    if (!text) return '줄거리 정보가 없습니다.';
    
    // 텍스트가 너무 길면 자르기
    if (text.length > maxLength) {
        return text.substring(0, maxLength) + '...';
    }
    
    return text;
}

// 히어로 슬라이드 생성 (수정됨)
function createHeroSlide(movie, isPreview = false) {
    const backdropUrl = movie.backdrop_path 
        ? `${IMAGE_BASE_URL}/w1280${movie.backdrop_path}`
        : (movie.poster_path 
          ? `${IMAGE_BASE_URL}/w1280${movie.poster_path}`
          : 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTI4MCIgaGVpZ2h0PSI3MjAiIHZpZXdCb3g9IjAgMCAxMjgwIDcyMCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjEyODAiIGhlaWdodD0iNzIwIiBmaWxsPSIjMWQxZDFkIi8+Cjx0ZXh0IHg9IjY0MCIgeT0iMzYwIiBmaWxsPSIjYmRiZGJkIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmb250LXNpemU9IjI0IiBmb250LXdlaWdodD0iYm9sZCI+Tm8gSW1hZ2U8L3RleHQ+Cjwvc3ZnPgo=');
    
    const year = movie.release_date ? new Date(movie.release_date).getFullYear() : '';
    const country = getCountryFlag(movie);
    const rating = movie.vote_average ? movie.vote_average.toFixed(1) : 'N/A';
    
    // 줄거리를 2줄로 제한
    const limitedOverview = limitTextToTwoLines(movie.overview, 100);
    
    const slideClass = isPreview ? 'hero-slide preview' : 'hero-slide';
    const overlayContent = isPreview ? '' : `
        <div class="hero-overlay">
            <div class="hero-meta">
                <span class="hero-country">${country}</span>
                <span class="hero-year">${year}</span>
                <span class="hero-genre">⭐ ${rating}</span>
            </div>
            <div class="hero-title">${movie.title}</div>
            <div class="hero-overview">${limitedOverview}</div>
        </div>
    `;
    
    return `
        <div class="${slideClass}" data-movie-id="${movie.id}">
            <img src="${backdropUrl}" alt="${movie.title}" class="hero-bg" onerror="this.src='data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTI4MCIgaGVpZ2h0PSI3MjAiIHZpZXdCb3g9IjAgMCAxMjgwIDcyMCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjEyODAiIGhlaWdodD0iNzIwIiBmaWxsPSIjMWQxZDFkIi8+Cjx0ZXh0IHg9IjY0MCIgeT0iMzYwIiBmaWxsPSIjYmRiZGJkIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmb250LXNpemU9IjI0IiBmb250LXdlaWdodD0iYm9sZCI+Tm8gSW1hZ2U8L3RleHQ+Cjwvc3ZnPgo='">
            ${overlayContent}
        </div>
    `;
}

// 포스터 카드 생성
function createPosterCard(movie) {
    const posterUrl = movie.poster_path 
        ? `${IMAGE_BASE_URL}/w500${movie.poster_path}`
        : 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjI0IiBoZWlnaHQ9IjMzMiIgdmlld0JveD0iMCAwIDIyNCAzMzIiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIyMjQiIGhlaWdodD0iMzMyIiBmaWxsPSIjMWQxZDFkIiBzdHJva2U9IiMzYTNhM2EiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWRhc2hhcnJheT0iNSw1Ii8+Cjx0ZXh0IHg9IjExMiIgeT0iMTY2IiBmaWxsPSIjYmRiZGJkIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmb250LXNpemU9IjE0IiBmb250LXdlaWdodD0iYm9sZCI+Tm8gSW1hZ2U8L3RleHQ+Cjwvc3ZnPgo=';
    
    const year = movie.release_date ? new Date(movie.release_date).getFullYear() : '';
    const rating = movie.vote_average ? movie.vote_average.toFixed(1) : 'N/A';
    const country = getCountryFlag(movie);
    
    return `
        <div class="movie-poster-card" data-movie-id="${movie.id}">
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

// 미리보기 업데이트 (수정됨)
function updatePreview(nextIndex) {
    if (!heroMovies || heroMovies.length === 0) return;
    
    const nextMovie = heroMovies[nextIndex];
    if (!nextMovie) return;
    
    const previewPoster = document.getElementById('previewPoster');
    const previewTitle = document.getElementById('previewTitle');
    const previewSubtitle = document.getElementById('previewSubtitle');
    
    if (!previewPoster || !previewTitle || !previewSubtitle) return;
    
    const posterUrl = nextMovie.poster_path 
        ? `${IMAGE_BASE_URL}/w500${nextMovie.poster_path}`
        : 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjQ1MCIgdmlld0JveD0iMCAwIDMwMCA0NTAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIzMDAiIGhlaWdodD0iNDUwIiBmaWxsPSIjMWQxZDFkIi8+Cjx0ZXh0IHg9IjE1MCIgeT0iMjI1IiBmaWxsPSIjYmRiZGJkIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmb250LXNpemU9IjE2IiBmb250LXdlaWdodD0iYm9sZCI+Tm8gSW1hZ2U8L3RleHQ+Cjwvc3ZnPgo=';
    
    // 미리보기 텍스트도 2줄로 제한
    const limitedSubtitle = limitTextToTwoLines(nextMovie.overview, 80);
    
    previewPoster.src = posterUrl;
    previewPoster.alt = nextMovie.title;
    previewTitle.textContent = nextMovie.title;
    previewSubtitle.textContent = limitedSubtitle || '곧 만나볼 수 있는 새로운 영화입니다.';
}

// 슬라이더 데이터 로드 (수정됨)
async function loadSlider(sliderId, dataType, isHero = false) {
    const slidesContainer = document.getElementById(sliderId);
    let movies = [];

    try {
        slidesContainer.innerHTML = '<div class="loading">영화를 불러오는 중...</div>';
        
        switch(dataType) {
            case 'trending':
                movies = await fetchTrendingMovies();
                break;
            case 'korean':
                movies = await fetchKoreanMovies();
                break;
            case 'popular':
                movies = await fetchMoviesByRegion('US');
                break;
            case 'now_playing':
                movies = await fetchMoviesByRegion('KR');
                break;
            case 'japanese':
                movies = await fetchMoviesByRegion('JP');
                break;
            default:
                movies = await fetchTrendingMovies();
        }

        if (movies.length === 0) {
            slidesContainer.innerHTML = '<div class="error">영화를 불러올 수 없습니다</div>';
            return;
        }

        if (isHero) {
            heroMovies = movies.slice(0, 5);
            slidesContainer.innerHTML = heroMovies
                .map(movie => createHeroSlide(movie, false))
                .join('');
        } else {
            slidesContainer.innerHTML = movies
                .map(movie => createPosterCard(movie))
                .join('');
        }
        
        console.log(`${sliderId} 로드 완료: ${movies.length}개 영화`);
        
    } catch (error) {
        console.error(`${sliderId} 로드 실패:`, error);
        slidesContainer.innerHTML = '<div class="error">로딩 중 오류가 발생했습니다</div>';
    }
}