// sub.js(서브 페이지)

// URL에서 영화 ID 가져오기
function getMovieIdFromURL() {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('id') || '527774';
}

// 국가 플래그 가져오기
function getCountryFlag(movie) {
    const lang = movie.original_language;
    const country = movie.origin_country?.[0];
    
    if (lang === 'ko' || country === 'KR') {
        return '<img src="https://flagcdn.com/16x12/kr.png" alt="KR" style="width:16px;height:12px;">';
    }
    if (lang === 'en' || country === 'US') {
        return '<img src="https://flagcdn.com/16x12/us.png" alt="US" style="width:16px;height:12px;">';
    }
    if (lang === 'ja' || country === 'JP') {
        return '<img src="https://flagcdn.com/16x12/jp.png" alt="JP" style="width:16px;height:12px;">';
    }
    
    return '🌍';
}

// 영화 국가 판별
function getMovieCountry(movie) {
    const lang = movie.original_language;
    const country = movie.origin_country?.[0];
    
    if (lang === 'ko' || country === 'KR') return 'KR';
    if (lang === 'en' || country === 'US') return 'US';
    if (lang === 'ja' || country === 'JP') return 'JP';
    
    return 'OTHER';
}

// 영화 상세 정보 가져오기
async function fetchMovieDetails(movieId) {
    try {
        const response = await fetch(`${BASE_URL}/movie/${movieId}?api_key=${API_KEY}&language=ko-KR`);
        
        if (!response.ok) {
            throw new Error(`HTTP 오류: ${response.status}`);
        }
        
        return await response.json();
    } catch (error) {
        console.error('영화 상세 정보 요청 실패:', error);
        return null;
    }
}

// 추천 영화 가져오기
async function fetchRecommendedMovies(movieDetails) {
    try {
        const currentCountry = getMovieCountry(movieDetails);
        let recommendedMovies = [];
        
        
        // 국가별 맞춤 추천
        const queries = [];
        
        if (currentCountry === 'KR') {
            queries.push(
                `${BASE_URL}/discover/movie?api_key=${API_KEY}&language=ko-KR&with_original_language=ko&primary_release_date.gte=2025-01-01&sort_by=popularity.desc&page=1`,
                `${BASE_URL}/discover/movie?api_key=${API_KEY}&language=ko-KR&with_original_language=ko&sort_by=vote_count.desc&page=1`
            );
        } else if (currentCountry === 'US') {
            queries.push(
                `${BASE_URL}/discover/movie?api_key=${API_KEY}&language=ko-KR&with_original_language=en&primary_release_date.gte=2025-01-01&sort_by=popularity.desc&page=1`,
                `${BASE_URL}/discover/movie?api_key=${API_KEY}&language=ko-KR&with_original_language=en&sort_by=vote_count.desc&page=1`
            );
        }
        
        // 병렬 요청
        for (const url of queries) {
            try {
                const response = await fetch(url);
                if (response.ok) {
                    const data = await response.json();
                    recommendedMovies = [...recommendedMovies, ...(data.results || [])];
                }
            } catch (e) {
                console.error('추천 영화 요청 실패:', e);
            }
        }
        
        // 3. 장르 기반 보완
        if (movieDetails.genres && movieDetails.genres.length > 0) {
            const genreIds = movieDetails.genres.map(g => g.id).slice(0, 2).join(',');
            const genreUrl = `${BASE_URL}/discover/movie?api_key=${API_KEY}&language=ko-KR&with_genres=${genreIds}&sort_by=popularity.desc&page=1`;
            
            try {
                const response = await fetch(genreUrl);
                if (response.ok) {
                    const data = await response.json();
                    recommendedMovies = [...recommendedMovies, ...(data.results || [])];
                }
            } catch (e) {
                console.error('장르 기반 추천 실패:', e);
            }
        }
        
        // 중복 제거 및 필터링
        const uniqueMovies = recommendedMovies
            .filter((movie, index, self) => 
                index === self.findIndex(m => m.id === movie.id) &&
                movie.id !== movieDetails.id &&
                movie.poster_path &&
                movie.adult === false
            );
        
        // 정렬 및 제한
        return uniqueMovies
            .sort((a, b) => {
                const aCountry = getMovieCountry(a);
                const bCountry = getMovieCountry(b);
                
                if (aCountry === currentCountry && bCountry !== currentCountry) return -1;
                if (bCountry === currentCountry && aCountry !== currentCountry) return 1;
                
                return (b.vote_count || 0) - (a.vote_count || 0);
            })
            .slice(0, 15);
        
    } catch (error) {
        console.error('추천 영화 검색 실패:', error);
        return [];
    }
}

// 런타임 변환
function formatRuntime(runtime) {
    if (!runtime) return '정보 없음';
    const hours = Math.floor(runtime / 60);
    const minutes = runtime % 60;
    return hours > 0 ? `${hours}시간 ${minutes}분` : `${minutes}분`;
}

// 서브 페이지 메인 HTML 생성
function createSubMainHTML(movie) {
    const posterUrl = movie.poster_path 
        ? `${IMAGE_BASE_URL}/w500${movie.poster_path}`
        : 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjI1MCIgdmlld0JveD0iMCAwIDQwMCAyNTAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSI0MDAiIGhlaWdodD0iMjUwIiBmaWxsPSIjMWQxZDFkIi8+Cjx0ZXh0IHg9IjIwMCIgeT0iMTI1IiBmaWxsPSIjYmRiZGJkIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmb250LXNpemU9IjE2IiBmb250LXdlaWdodD0iYm9sZCI+Tm8gSW1hZ2U8L3RleHQ+Cjwvc3ZnPgo=';
    
    const backdropUrl = movie.backdrop_path 
        ? `${IMAGE_BASE_URL}/w1280${movie.backdrop_path}` : '';

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
            
            <div class="sub-right-section">
                <img src="${posterUrl}" alt="${movie.title}" class="sub-movie-poster">
            </div>
        </div>
    `;
}

// 포스터 카드 생성
function createPosterCardWithLink(movie) {
    const posterUrl = movie.poster_path 
        ? `${IMAGE_BASE_URL}/w500${movie.poster_path}`
        : 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjI0IiBoZWlnaHQ9IjMzMiIgdmlld0JveD0iMCAwIDIyNCAzMzIiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIyMjQiIGhlaWdodD0iMzMyIiBmaWxsPSIjMWQxZDFkIiBzdHJva2U9IiMzYTNhM2EiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWRhc2hhcnJheT0iNSw1Ii8+Cjx0ZXh0IHg9IjExMiIgeT0iMTY2IiBmaWxsPSIjYmRiZGJkIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmb250LXNpemU9IjE0IiBmb250LXdlaWdodD0iYm9sZCI+Tm8gSW1hZ2U8L3RleHQ+Cjwvc3ZnPgo=';
    
    const year = movie.release_date ? new Date(movie.release_date).getFullYear() : '';
    const rating = movie.vote_average ? movie.vote_average.toFixed(1) : 'N/A';
    const country = getCountryFlag(movie);
    
    return `
        <div class="movie-poster-card" data-movie-id="${movie.id}" onclick="navigateToSubPage(${movie.id})">
            <img src="${posterUrl}" alt="${movie.title}" class="movie-poster-img">
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
    
    const cardWidth = cards[0].offsetWidth + 12;
    const scrollAmount = cardWidth * 5;
    
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
        const movieDetails = await fetchMovieDetails(movieId);
        
        if (!movieDetails) {
            subMainContainer.innerHTML = '<div class="error">영화 정보를 불러올 수 없습니다</div>';
            return;
        }
        
        subMainContainer.innerHTML = createSubMainHTML(movieDetails);
        document.title = `${movieDetails.title} | WATCHA`;
        
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
        const recommendedMovies = await fetchRecommendedMovies(movieDetails);
        
        if (recommendedMovies.length === 0) {
            recommendSlides.innerHTML = '<div class="error">추천 영화를 불러올 수 없습니다</div>';
            return;
        }
        
        recommendSlides.innerHTML = recommendedMovies
            .map(movie => createPosterCardWithLink(movie))
            .join('');
        
        setTimeout(() => {
            const slider = document.getElementById('recommendSlider');
            initSubSlider(slider);
        }, 100);
        
    } catch (error) {
        console.error('추천 영화 로드 실패:', error);
        recommendSlides.innerHTML = '<div class="error">추천 영화 로딩 중 오류가 발생했습니다</div>';
    }
}

// 검색 기능 초기화
function initSubSearchFunction() {
    document.getElementById('searchForm').addEventListener('submit', (e) => {
        e.preventDefault();
        const query = document.getElementById('searchInput').value.trim();
        if (query) {
            window.location.href = `../index.html?search=${encodeURIComponent(query)}`;
        }
    });
}

// 서브 페이지 초기화
async function initSubPage() {
    try {
        await loadSubMovieDetail();
        initSubSearchFunction();
    } catch (error) {
        console.error('서브 페이지 초기화 실패:', error);
    }
}

// DOM 로드 완료 시 실행
document.addEventListener('DOMContentLoaded', initSubPage);