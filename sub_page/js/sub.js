// sub.js - 서브 페이지 전용 스크립트 (2025년 영화 우선 추천으로 수정)

// URL에서 영화 ID 가져오기
function getMovieIdFromURL() {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('id') || '527774'; // 기본값: 스파이더맨 노 웨이 홈
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
    
    // 기타 국가
    if (originalLang === 'zh' || originCountry === 'CN') {
        return '<img src="https://flagcdn.com/16x12/cn.png" alt="CN" style="width:16px;height:12px;">';
    }
    if (originalLang === 'fr' || originCountry === 'FR') {
        return '<img src="https://flagcdn.com/16x12/fr.png" alt="FR" style="width:16px;height:12px;">';
    }
    if (originalLang === 'de' || originCountry === 'DE') {
        return '<img src="https://flagcdn.com/16x12/de.png" alt="DE" style="width:16px;height:12px;">';
    }
    
    return '🌐';
}

// 상세 영화 정보 가져오기
async function fetchMovieDetails(movieId) {
    try {
        console.log(`영화 상세 정보 요청: ${movieId}`);
        
        const response = await fetch(`${BASE_URL}/movie/${movieId}?api_key=${API_KEY}&language=ko-KR`, {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            throw new Error(`HTTP 오류: ${response.status}`);
        }
        
        const movieDetails = await response.json();
        console.log('영화 상세 정보 로드 완료');
        
        return movieDetails;
    } catch (error) {
        console.error('영화 상세 정보 요청 실패:', error);
        return null;
    }
}

// 장르 기반 추천 영화 가져오기 (2025년 영화 우선)
async function fetchRecommendedMovies(movieDetails) {
    try {
        console.log('추천 영화 검색 시작...');
        
        let recommendedMovies = [];
        const ALLOWED_COUNTRIES = ['KR', 'US', 'JP'];
        const ALLOWED_LANGUAGES = ['ko', 'en', 'ja'];
        
        // 1. 2025년 같은 장르 영화 우선 검색
        if (movieDetails.genres && movieDetails.genres.length > 0) {
            const genreIds = movieDetails.genres.map(genre => genre.id).slice(0, 2); // 최대 2개 장르
            const genreQuery = genreIds.join(',');
            
            console.log('2025년 같은 장르 영화 검색...');
            const movies2025 = await fetch(`${BASE_URL}/discover/movie?api_key=${API_KEY}&language=ko-KR&with_genres=${genreQuery}&primary_release_date.gte=2025-01-01&primary_release_date.lte=2025-12-31&sort_by=popularity.desc&page=1`);
            
            if (movies2025.ok) {
                const data2025 = await movies2025.json();
                const filtered2025 = (data2025.results || []).filter(movie => 
                    movie.id !== movieDetails.id &&
                    movie.poster_path &&
                    movie.adult === false &&
                    (ALLOWED_COUNTRIES.includes(movie.origin_country?.[0]) || 
                     ALLOWED_LANGUAGES.includes(movie.original_language))
                );
                recommendedMovies = [...recommendedMovies, ...filtered2025];
            }
        }
        
        // 2. 2024년 같은 장르 영화
        if (recommendedMovies.length < 8 && movieDetails.genres && movieDetails.genres.length > 0) {
            const genreIds = movieDetails.genres.map(genre => genre.id).slice(0, 2);
            const genreQuery = genreIds.join(',');
            
            console.log('2024년 같은 장르 영화 검색...');
            const movies2024 = await fetch(`${BASE_URL}/discover/movie?api_key=${API_KEY}&language=ko-KR&with_genres=${genreQuery}&primary_release_date.gte=2024-01-01&primary_release_date.lte=2024-12-31&sort_by=popularity.desc&page=1`);
            
            if (movies2024.ok) {
                const data2024 = await movies2024.json();
                const filtered2024 = (data2024.results || []).filter(movie => 
                    movie.id !== movieDetails.id &&
                    movie.poster_path &&
                    movie.adult === false &&
                    !recommendedMovies.find(m => m.id === movie.id) &&
                    (ALLOWED_COUNTRIES.includes(movie.origin_country?.[0]) || 
                     ALLOWED_LANGUAGES.includes(movie.original_language))
                );
                recommendedMovies = [...recommendedMovies, ...filtered2024];
            }
        }
        
        // 3. 비슷한 영화 API 사용 (최신 영화 우선)
        if (recommendedMovies.length < 10) {
            console.log('비슷한 영화 검색...');
            const similarResponse = await fetch(`${BASE_URL}/movie/${movieDetails.id}/similar?api_key=${API_KEY}&language=ko-KR&page=1`);
            
            if (similarResponse.ok) {
                const similarData = await similarResponse.json();
                const filteredSimilar = (similarData.results || []).filter(movie => {
                    const releaseYear = movie.release_date ? new Date(movie.release_date).getFullYear() : 0;
                    return movie.poster_path &&
                           movie.adult === false &&
                           releaseYear >= 2020 &&
                           !recommendedMovies.find(m => m.id === movie.id) &&
                           (ALLOWED_COUNTRIES.includes(movie.origin_country?.[0]) || 
                            ALLOWED_LANGUAGES.includes(movie.original_language));
                })
                .sort((a, b) => new Date(b.release_date || 0) - new Date(a.release_date || 0)); // 최신순
                
                recommendedMovies = [...recommendedMovies, ...filteredSimilar];
            }
        }
        
        // 4. 여전히 부족한 경우 최신 인기 영화로 보완
        if (recommendedMovies.length < 10) {
            console.log('최신 인기 영화로 보완...');
            
            // 2025년 인기 영화
            const popular2025 = await fetch(`${BASE_URL}/discover/movie?api_key=${API_KEY}&language=ko-KR&primary_release_date.gte=2025-01-01&primary_release_date.lte=2025-12-31&sort_by=popularity.desc&page=1`);
            
            if (popular2025.ok) {
                const popularData2025 = await popular2025.json();
                const filteredPopular2025 = (popularData2025.results || []).filter(movie => 
                    movie.id !== movieDetails.id &&
                    movie.poster_path &&
                    movie.adult === false &&
                    !recommendedMovies.find(m => m.id === movie.id) &&
                    (ALLOWED_COUNTRIES.includes(movie.origin_country?.[0]) || 
                     ALLOWED_LANGUAGES.includes(movie.original_language))
                );
                recommendedMovies = [...recommendedMovies, ...filteredPopular2025];
            }
            
            // 2024년 인기 영화
            if (recommendedMovies.length < 10) {
                const popular2024 = await fetch(`${BASE_URL}/discover/movie?api_key=${API_KEY}&language=ko-KR&primary_release_date.gte=2024-01-01&primary_release_date.lte=2024-12-31&sort_by=popularity.desc&page=1`);
                
                if (popular2024.ok) {
                    const popularData2024 = await popular2024.json();
                    const filteredPopular2024 = (popularData2024.results || []).filter(movie => 
                        movie.id !== movieDetails.id &&
                        movie.poster_path &&
                        movie.adult === false &&
                        !recommendedMovies.find(m => m.id === movie.id) &&
                        (ALLOWED_COUNTRIES.includes(movie.origin_country?.[0]) || 
                         ALLOWED_LANGUAGES.includes(movie.original_language))
                    );
                    recommendedMovies = [...recommendedMovies, ...filteredPopular2024];
                }
            }
        }
        
        // 최종 정렬: 2025년 > 2024년 > 2023년 순으로 최신순 정렬
        const finalMovies = recommendedMovies
            .sort((a, b) => {
                const dateA = new Date(a.release_date || '1970-01-01');
                const dateB = new Date(b.release_date || '1970-01-01');
                return dateB - dateA; // 최신순
            })
            .slice(0, 15); // 15개로 제한
        
        console.log(`추천 영화 ${finalMovies.length}개 발견 (2025년 영화 우선)`);
        return finalMovies;
        
    } catch (error) {
        console.error('추천 영화 검색 실패:', error);
        return [];
    }
}

// 런타임 변환 (분 -> 시간:분)
function formatRuntime(runtime) {
    if (!runtime) return '정보 없음';
    const hours = Math.floor(runtime / 60);
    const minutes = runtime % 60;
    return hours > 0 ? `${hours}시간 ${minutes}분` : `${minutes}분`;
}

// 서브 페이지 메인 컨테이너 HTML 생성
function createSubMainHTML(movie) {
    const posterUrl = movie.poster_path 
        ? `${IMAGE_BASE_URL}/w500${movie.poster_path}`
        : 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjI1MCIgdmlld0JveD0iMCAwIDQwMCAyNTAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSI0MDAiIGhlaWdodD0iMjUwIiBmaWxsPSIjMWQxZDFkIi8+Cjx0ZXh0IHg9IjIwMCIgeT0iMTI1IiBmaWxsPSIjYmRiZGJkIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmb250LXNpemU9IjE2IiBmb250LXdlaWdodD0iYm9sZCI+Tm8gSW1hZ2U8L3RleHQ+Cjwvc3ZnPgo=';
    
    const backdropUrl = movie.backdrop_path 
        ? `${IMAGE_BASE_URL}/w1280${movie.backdrop_path}`
        : '';

    const year = movie.release_date ? new Date(movie.release_date).getFullYear() : '';
    const rating = movie.vote_average ? movie.vote_average.toFixed(1) : 'N/A';
    const runtime = formatRuntime(movie.runtime);
    const country = getCountryFlag(movie);
    
    const genres = movie.genres ? movie.genres.map(genre => 
        `<span class="sub-genre">${genre.name}</span>`
    ).join('') : '';

    return `
        <div class="sub-main-content">
            ${backdropUrl ? `<img src="${backdropUrl}" alt="${movie.title}" class="sub-backdrop">` : ''}
            
            <!-- 왼쪽: 영화 정보 -->
            <div class="sub-left-section">
                <div class="sub-movie-info">
                    <h1 class="sub-movie-title">${movie.title}</h1>
                    ${movie.original_title !== movie.title ? 
                        `<div class="sub-movie-original-title">${movie.original_title}</div>` : ''
                    }
                    
                    <div class="sub-movie-meta">
                        <div class="sub-meta-item sub-rating">
                            <span class="material-symbols-outlined">star</span>
                            ${rating}
                        </div>
                        <div class="sub-meta-item sub-year">
                            <span class="material-symbols-outlined">calendar_month</span>
                            ${year}
                        </div>
                        <div class="sub-meta-item sub-runtime">
                            <span class="material-symbols-outlined">schedule</span>
                            ${runtime}
                        </div>
                        <div class="sub-meta-item">
                            ${country}
                        </div>
                    </div>
                    
                    ${genres ? `<div class="sub-genres">${genres}</div>` : ''}
                    
                    <div class="sub-overview">
                        ${movie.overview || '줄거리 정보가 없습니다.'}
                    </div>
                </div>
                
                <div class="sub-actions">
                    <button class="sub-btn sub-btn-primary">
                        <span class="material-symbols-outlined">shopping_cart</span>
                        구매하기
                    </button>
                    <button class="sub-btn sub-btn-secondary">
                        <span class="material-symbols-outlined">card_giftcard</span>
                        선물하기
                    </button>
                </div>
            </div>
            
            <!-- 오른쪽: 영화 이미지 -->
            <div class="sub-right-section">
                <img src="${posterUrl}" alt="${movie.title}" class="sub-movie-poster" onerror="this.src='data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjI1MCIgdmlld0JveD0iMCAwIDQwMCAyNTAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSI0MDAiIGhlaWdodD0iMjUwIiBmaWxsPSIjMWQxZDFkIi8+Cjx0ZXh0IHg9IjIwMCIgeT0iMTI1IiBmaWxsPSIjYmRiZGJkIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmb250LXNpemU9IjE2IiBmb250LXdlaWdodD0iYm9sZCI+Tm8gSW1hZ2U8L3RleHQ+Cjwvc3ZnPgo='">
            </div>
        </div>
    `;
}

// 포스터 카드 생성 (클릭 이벤트 포함)
function createPosterCardWithLink(movie) {
    const posterUrl = movie.poster_path 
        ? `${IMAGE_BASE_URL}/w500${movie.poster_path}`
        : 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjI0IiBoZWlnaHQ9IjMzMiIgdmlld0JveD0iMCAwIDIyNCAzMzIiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIyMjQiIGhlaWdodD0iMzMyIiBmaWxsPSIjMWQxZDFkIiBzdHJva2U9IiMzYTNhM2EiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWRhc2hhcnJheT0iNSw1Ii8+Cjx0ZXh0IHg9IjExMiIgeT0iMTY2IiBmaWxsPSIjYmRiZGJkIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmb250LXNpemU9IjE0IiBmb250LXdlaWdodD0iYm9sZCI+Tm8gSW1hZ2U8L3RleHQ+Cjwvc3ZnPgo=';
    
    const year = movie.release_date ? new Date(movie.release_date).getFullYear() : '';
    const rating = movie.vote_average ? movie.vote_average.toFixed(1) : 'N/A';
    const country = getCountryFlag(movie);
    
    return `
        <div class="movie-poster-card" data-movie-id="${movie.id}" onclick="navigateToSubPage(${movie.id})">
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

// 서브 페이지로 이동
function navigateToSubPage(movieId) {
    window.location.href = `index.html?id=${movieId}`;
}

// 슬라이더 초기화
function initSubSlider(sliderElement) {
    const viewport = sliderElement.querySelector('.slider-viewport');
    const slides = sliderElement.querySelector('.poster-slides');
    const prevBtn = sliderElement.querySelector('.slider-btn.prev');
    const nextBtn = sliderElement.querySelector('.slider-btn.next');
    
    if (!viewport || !slides || !prevBtn || !nextBtn) return;
    
    const cards = slides.querySelectorAll('.movie-poster-card');
    if (cards.length === 0) return;
    
    const cardWidth = cards[0].offsetWidth + 12; // gap 포함
    const scrollAmount = cardWidth * 5; // 5개씩 스크롤
    
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

// 영화 상세 정보 로드
async function loadSubMovieDetail() {
    const movieId = getMovieIdFromURL();
    const subMainContainer = document.getElementById('subMainContainer');
    
    try {
        console.log(`서브 페이지 영화 로드 시작: ID ${movieId}`);
        
        // 영화 상세 정보 가져오기
        const movieDetails = await fetchMovieDetails(movieId);
        
        if (!movieDetails) {
            subMainContainer.innerHTML = '<div class="error">영화 정보를 불러올 수 없습니다</div>';
            return;
        }
        
        // 서브 페이지 메인 컨테이너 HTML 생성 및 표시
        subMainContainer.innerHTML = createSubMainHTML(movieDetails);
        
        // 페이지 제목 업데이트
        document.title = `${movieDetails.title} | WATCHA`;
        
        console.log(`서브 페이지 영화 정보 로드 완료: ${movieDetails.title}`);
        
        // 추천 영화 로드
        await loadRecommendedMovies(movieDetails);
        
    } catch (error) {
        console.error('서브 페이지 영화 정보 로드 실패:', error);
        subMainContainer.innerHTML = '<div class="error">영화 정보 로딩 중 오류가 발생했습니다</div>';
    }
}

// 추천 영화 로드
async function loadRecommendedMovies(movieDetails) {
    const recommendSlides = document.getElementById('recommendSlides');
    
    try {
        console.log(`추천 영화 로드 시작: ${movieDetails.title}`);
        
        // 장르 및 줄거리 기반 추천 영화 가져오기 (2025년 우선)
        const recommendedMovies = await fetchRecommendedMovies(movieDetails);
        
        if (recommendedMovies.length === 0) {
            recommendSlides.innerHTML = '<div class="error">추천 영화를 불러올 수 없습니다</div>';
            return;
        }
        
        // 추천 영화 HTML 생성
        recommendSlides.innerHTML = recommendedMovies
            .map(movie => createPosterCardWithLink(movie))
            .join('');
        
        console.log(`추천 영화 ${recommendedMovies.length}개 로드 완료 (2025년 영화 우선)`);
        
        // 슬라이더 초기화
        setTimeout(() => {
            const slider = document.getElementById('recommendSlider');
            initSubSlider(slider);
        }, 100);
        
    } catch (error) {
        console.error('추천 영화 로드 실패:', error);
        recommendSlides.innerHTML = '<div class="error">추천 영화 로딩 중 오류가 발생했습니다</div>';
    }
}

// 검색 기능 초기화 (메인 페이지로 이동)
function initSubSearchFunction() {
    document.getElementById('searchForm').addEventListener('submit', (e) => {
        e.preventDefault();
        const query = document.getElementById('searchInput').value.trim();
        if (query) {
            // 메인 페이지로 검색어와 함께 이동
            window.location.href = `../index.html?search=${encodeURIComponent(query)}`;
        }
    });
}

// 서브 페이지 초기화
async function initSubPage() {
    console.log('서브 페이지 초기화 시작...');
    
    try {
        // 영화 상세 정보 및 추천 영화 로드
        await loadSubMovieDetail();
        
        // 검색 기능 초기화
        initSubSearchFunction();
        
        console.log('서브 페이지 초기화 완료');
        
    } catch (error) {
        console.error('서브 페이지 초기화 실패:', error);
    }
}

// DOM 로드 완료 시 실행
document.addEventListener('DOMContentLoaded', initSubPage);