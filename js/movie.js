// movie.js - API 처리 및 데이터 로딩 (메인 슬라이더 지정 영화만 표시)

// TMDB API 설정
const API_KEY = '17a4bb5f06898610d5c57f854cdbc5b0';
const BASE_URL = 'https://api.themoviedb.org/3';
const IMAGE_BASE_URL = 'https://image.tmdb.org/t/p';

// 전역 변수
let heroMovies = [];
let currentHeroIndex = 0;

// 허용 국가 및 언어 목록
const ALLOWED_COUNTRIES = ['KR', 'US', 'JP'];
const ALLOWED_LANGUAGES = ['ko', 'en', 'ja'];

// 유명 한국 감독 목록
const KOREAN_DIRECTORS = ['봉준호', '박찬욱', '류승완', '장재현', '연상호'];

// 메인 슬라이더에 표시할 순서 (ID)
const MAIN_SLIDER_MOVIES = [
  {
    title: '어쩔 수 없다',
    director: '박찬욱',
    movieId: 639988, // NO OTHER CHOICE의 정확한 TMDB ID
    searchTerms: ['Decision to Leave', '어쩔 수 없다', 'NO OTHER CHOICE', 'Park Chan-wook']
  },
  {
    title: 'F1',
    director: null,
    movieId: 911430, // F1의 정확한 TMDB ID
    searchTerms: ['F1', 'F1 The Movie', 'Formula 1']
  },
  {
    title: '모노노케 히메',
    director: '미야자키 하야오',
    movieId: 128, // Princess Mononoke의 정확한 TMDB ID
    searchTerms: ['Princess Mononoke', '모노노케 히메', 'もののけ姫', 'Miyazaki', 'Mononoke Hime']
  },
  {
    title: '원배틀에프터어나더',
    director: null,
    movieId: 1054867, // One Battle After Another의 정확한 TMDB ID
    searchTerms: ['One Battle After Another', '원배틀에프터어나더', 'One Battle']
  },
  {
    title: '극장판 귀멸의 칼날: 무한성편',
    director: '소토자키 하루오',
    movieId: 1311031, // 무한성편의 정확한 TMDB ID
    searchTerms: ['Demon Slayer Mugen Train', '귀멸의 칼날', '무한성편', 'Kimetsu no Yaiba', '鬼滅の刃']
  }
];

// API 요청 함수
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

// 영화 상세 정보 가져오기
async function fetchMovieDetails(movieId) {
  try {
    const response = await fetch(
      `${BASE_URL}/movie/${movieId}?api_key=${API_KEY}&language=ko-KR&append_to_response=credits`
    );

    if (!response.ok) {
      throw new Error(`HTTP 오류: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('영화 상세 정보 요청 실패:', error);
    return null;
  }
}

// 지정된 영화 검색 또는 직접 가져오기 함수
async function searchSpecificMovie(movieInfo) {
  try {
    console.log(`"${movieInfo.title}" 검색 중...`);

    // movieId가 있는 경우 직접 가져오기
    if (movieInfo.movieId) {
      const movieDetails = await fetchMovieDetails(movieInfo.movieId);
      if (movieDetails && movieDetails.poster_path) {
        console.log(`"${movieInfo.title}" ID(${movieInfo.movieId})로 직접 발견: ${movieDetails.title}`);
        return movieDetails;
      } else {
        console.log(`"${movieInfo.title}" ID(${movieInfo.movieId})로 찾지 못함, 검색으로 시도`);
      }
    }

    // ID로 찾지 못한 경우 검색으로 찾기
    for (const searchTerm of movieInfo.searchTerms) {
      console.log(`"${searchTerm}" 검색어로 시도 중...`);

      const searchResults = await fetchMovies('/search/movie', {
        query: searchTerm,
        include_adult: false,
        language: 'ko-KR'
      });

      if (searchResults.length > 0) {
        console.log(`"${searchTerm}" 검색 결과 ${searchResults.length}개 발견`);

        // 특별 매칭 로직
        let bestMatch = null;

        if (movieInfo.title === '어쩔 수 없다') {
          bestMatch = searchResults.find(movie => {
            const title = movie.title?.toLowerCase() || '';
            const originalTitle = movie.original_title?.toLowerCase() || '';
            return (
              originalTitle.includes('no other choice') ||
              originalTitle.includes('decision to leave') ||
              title.includes('어쩔') ||
              movie.id === 639988
            );
          });
        } else if (movieInfo.title === 'F1') {
          bestMatch = searchResults.find(movie => {
            const title = movie.title?.toLowerCase() || '';
            const originalTitle = movie.original_title?.toLowerCase() || '';
            return (
              title.includes('f1') ||
              originalTitle.includes('f1') ||
              movie.id === 911430
            );
          });
        } else if (movieInfo.title === '극장판 귀멸의 칼날: 무한성편') {
          bestMatch = searchResults.find(movie => {
            const title = movie.title?.toLowerCase() || '';
            const originalTitle = movie.original_title?.toLowerCase() || '';
            return (
              (originalTitle.includes('demon slayer') && originalTitle.includes('mugen')) ||
              (title.includes('귀멸') && (title.includes('무한성') || title.includes('무한열차'))) ||
              movie.id === 1311031
            );
          });
        } else if (movieInfo.title === '모노노케 히메') {
          bestMatch = searchResults.find(movie => {
            const originalTitle = movie.original_title?.toLowerCase() || '';
            return originalTitle.includes('princess mononoke') || movie.id === 128;
          });
        } else if (movieInfo.title === '원배틀에프터어나더') {
          bestMatch = searchResults.find(movie => {
            const title = movie.title?.toLowerCase() || '';
            const originalTitle = movie.original_title?.toLowerCase() || '';
            return (
              originalTitle.includes('one battle after another') ||
              title.includes('원배틀') ||
              movie.id === 1054867
            );
          });
        } else {
          // 일반적인 매칭
          bestMatch = searchResults.find(movie => {
            const movieTitle = movie.title?.toLowerCase() || '';
            const originalTitle = movie.original_title?.toLowerCase() || '';
            const searchLower = searchTerm.toLowerCase();
            return movieTitle.includes(searchLower) || originalTitle.includes(searchLower);
          });
        }

        if (!bestMatch && searchResults.length > 0) {
          // 포스터가 있는 첫 번째 결과 사용
          bestMatch = searchResults.find(movie => movie.poster_path);
        }

        if (bestMatch && bestMatch.poster_path) {
          console.log(`"${movieInfo.title}" 매칭 성공: ${bestMatch.title} (ID: ${bestMatch.id})`);
          return bestMatch;
        }
      }

      // API 요청 간격
      await new Promise(resolve => setTimeout(resolve, 400));
    }

    console.warn(`"${movieInfo.title}" 모든 방법으로 찾지 못함`);
    return null;
  } catch (error) {
    console.error(`"${movieInfo.title}" 검색 실패:`, error);
    return null;
  }
}

// 메인 슬라이더용 지정 영화들 로드
async function fetchMainSliderMovies() {
  try {
    console.log('메인 슬라이더 지정 영화 검색 시작...');
    console.log('지정 영화 목록:');
    MAIN_SLIDER_MOVIES.forEach(movie => {
      console.log(`- ${movie.title} (${movie.director || 'Unknown Director'})`);
    });

    const foundMovies = [];

    // 각 지정 영화를 검색 또는 직접 가져오기
    for (const movieInfo of MAIN_SLIDER_MOVIES) {
      const movie = await searchSpecificMovie(movieInfo);
      if (movie && movie.poster_path) {
        // 영화 제목을 한국어로 보정
        if (movieInfo.title === '어쩔 수 없다') {
          movie.title = '어쩔 수 없다';
        }
        if (movieInfo.title === '모노노케 히메' && movie.original_title === 'Princess Mononoke') {
          movie.title = '모노노케 히메';
        }
        if (movieInfo.title === 'F1') {
          movie.title = 'F1';
        }
        if (movieInfo.title === '극장판 귀멸의 칼날: 무한성편') {
          movie.title = '극장판 귀멸의 칼날: 무한성편';
        }
        if (movieInfo.title === '원배틀에프터어나더') {
          movie.title = '원배틀에프터어나더';
        }

        foundMovies.push(movie);
        console.log(`✅ ${movieInfo.title} 추가 완료`);
      } else {
        console.log(`❌ ${movieInfo.title} 찾지 못함`);
      }

      // API 요청 제한을 위한 지연
      await new Promise(resolve => setTimeout(resolve, 800));
    }

    console.log(`메인 슬라이더용 영화 ${foundMovies.length}개 발견`);

    // 부족한 영화가 있어도 지정된 영화들만 표시 (보완하지 않음)
    if (foundMovies.length === 0) {
      console.warn('지정된 영화를 찾지 못했습니다. 대체 영화를 로드합니다.');
      // 최후의 수단으로 인기 영화 몇 개만 로드
      const backupMovies = await fetchMovies('/movie/popular', {
        region: 'KR'
      });

      const filteredBackup = backupMovies
        .filter(movie => movie.poster_path && movie.adult === false)
        .slice(0, 3);

      return filteredBackup;
    }

    return foundMovies; // 찾은 영화들만 반환
  } catch (error) {
    console.error('메인 슬라이더 영화 로드 실패:', error);

    // 에러 발생시 최소한의 대체 영화들 로드
    try {
      const backupMovies = await fetchMovies('/movie/popular', {
        region: 'KR'
      });

      return backupMovies
        .filter(movie => movie.poster_path && movie.adult === false)
        .slice(0, 3);
    } catch (backupError) {
      console.error('대체 영화 로드도 실패:', backupError);
      return [];
    }
  }
}

// 감독 확인 함수
function hasKoreanDirector(credits) {
  if (!credits || !credits.crew) return false;

  const directors = credits.crew.filter(person => person.job === 'Director');
  return directors.some(director =>
    KOREAN_DIRECTORS.some(koreanDirector =>
      director.name.includes(koreanDirector) ||
      director.original_name?.includes(koreanDirector)
    )
  );
}

// 최신 영화 슬라이더 기본 필터링
function filterMoviesByCountryAndDate(movies) {
  return movies
    .filter(movie => {
      if (movie.adult === true || !movie.poster_path) return false;

      const originCountry = movie.origin_country?.[0] || movie.original_language;
      const originalLang = movie.original_language;

      return (
        ALLOWED_COUNTRIES.includes(originCountry) ||
        ALLOWED_LANGUAGES.includes(originalLang)
      );
    })
}

// 지역별 영화 검색
async function fetchMoviesByRegion(region = 'KR') {
  try {
    console.log(`${region} 지역 영화 검색 시작...`);

    let allMovies = [];
    // 인기 영화
    const popularMovies = await fetchMovies('/movie/popular', { region });
    allMovies = [...allMovies, ...popularMovies];

    // 현재 상영작
    const nowPlayingMovies = await fetchMovies('/movie/now_playing', { region });
    allMovies = [...allMovies, ...nowPlayingMovies];

    // 중복 제거
    const uniqueMovies = allMovies.filter(
      (movie, index, self) => index === self.findIndex(m => m.id === movie.id)
    );

    const filteredMovies = filterMoviesByCountryAndDate(uniqueMovies);

    console.log(`${region} 지역 영화 ${filteredMovies.length}개 발견`);
    return filteredMovies.slice(0, 10);
  } catch (error) {
    console.error(`${region} 지역 영화 검색 실패:`, error);
    return [];
  }
}

// 트렌딩 영화 검색
async function fetchTrendingMovies() {
  try {
    console.log('트렌딩 영화 검색 시작...');

    let allTrendingMovies = [];

    // 2025년 최신 영화
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

    // 중복 제거 및 필터링
    const uniqueMovies = allTrendingMovies.filter(
      (movie, index, self) => index === self.findIndex(m => m.id === movie.id)
    );

    const filteredMovies = filterMoviesByCountryAndDate(uniqueMovies);
    console.log(`트렌딩 영화 ${filteredMovies.length}개 발견`);

    return filteredMovies.slice(0, 10);
  } catch (error) {
    console.error('트렌딩 영화 검색 실패:', error);
    return [];
  }
}

// 수동으로 선별된 한국 영화 목록 (지정 감독 작품만)
async function fetchKoreanMovies() {
  try {
    console.log('지정 감독 한국 영화 검색 시작...');

    // 지정 감독들의 대표작 ID 목록
    const directorMovies = {
      // 봉준호 감독
      bong: [
        696506,  // 미키 17 (2025)
        496243,  // 기생충 (2019)
        44865,   // 옥자 (2017)
        124,     // 살인의 추억 (2003)
        496,     // 괴물 (2006)
        18983,   // 마더 (2009)
        61,      // 살인의 추억 (2003)
        18983    // 마더 (2009)
      ],
      // 박찬욱 감독
      park: [
        44214,   // 아가씨 (2016) 
        18851,   // 친절한 금자씨 (2005)
        670,     // 올드보이 (2003)
        4550,    // 박쥐 (2009) 
        11216    // JSA 공동경비구역 (2000)
      ],
      // 류승완 감독
      ryu: [
        507089,  // 모가디슈 (2021)
        290859,  // 군함도 (2017)
        24,      // 베테랑 (2015)
        18983,   // 부당거래 (2010)
        667216,  // 보이스 (2017)
        455207   // 극한직업 (2019) 
      ],
      // 장재현 감독
      jang: [
        133200,  // 광해, 왕이 된 남자 (2012)
        360551,  // 검은 사제들 (2015)
        838209,  // 파묘 (2024)
      ]
    };

    const allMovieIds = [
      ...directorMovies.bong,
      ...directorMovies.park,
      ...directorMovies.ryu,
      ...directorMovies.jang
    ];

    const koreanMovies = [];

    // 각 영화의 상세 정보를 가져와서 필터링
    for (const movieId of allMovieIds) {
      try {
        const movieDetails = await fetchMovieDetails(movieId);

        if (
          movieDetails &&
          movieDetails.adult === false && // 19금 제외
          movieDetails.poster_path &&
          (movieDetails.original_language === 'ko' ||
            movieDetails.origin_country?.includes('KR'))
        ) {
          // 감독 확인
          const directors = movieDetails.credits?.crew?.filter(person => person.job === 'Director') || [];
          const hasTargetDirector = directors.some(director =>
            director.name.includes('봉준호') ||
            director.name.includes('박찬욱') ||
            director.name.includes('류승완') ||
            director.name.includes('장재현') ||
            director.original_name?.includes('Bong Joon Ho') ||
            director.original_name?.includes('Park Chan-wook') ||
            director.original_name?.includes('Ryoo Seung-wan') ||
            director.original_name?.includes('Jang Jae-hyun')
          );

          if (hasTargetDirector) {
            koreanMovies.push(movieDetails);
          }
        }

        // API 요청 제한을 위한 지연
        await new Promise(resolve => setTimeout(resolve, 150));
      } catch (error) {
        console.error(`영화 ID ${movieId} 정보 가져오기 실패:`, error);
      }
    }

    // 추가로 감독 이름으로 직접 검색 (보완용)
    const directorNames = ['봉준호', '박찬욱', '류승완', '장재현'];

    for (const directorName of directorNames) {
      try {
        // 감독 이름으로 검색
        const searchResults = await fetchMovies('/search/person', {
          query: directorName
        });

        if (searchResults.length > 0) {
          const director = searchResults[0];

          // 해당 감독의 영화 목록 가져오기
          const directorCredits = await fetch(
            `${BASE_URL}/person/${director.id}/movie_credits?api_key=${API_KEY}&language=ko-KR`
          );

          if (directorCredits.ok) {
            const creditsData = await directorCredits.json();
            const directorMovies = creditsData.crew?.filter(movie =>
              movie.job === 'Director' &&
              movie.adult === false &&
              movie.poster_path &&
              (movie.original_language === 'ko' || movie.origin_country?.includes('KR'))
            ).slice(0, 3) || []; // 각 감독당 최대 3편

            koreanMovies.push(...directorMovies);
          }
        }

        // API 요청 간격
        await new Promise(resolve => setTimeout(resolve, 200));
      } catch (error) {
        console.error(`감독 ${directorName} 검색 실패:`, error);
      }
    }

    // 중복 제거 및 최종 필터링
    const uniqueKoreanMovies = koreanMovies
      .filter((movie, index, self) =>
        index === self.findIndex(m => m.id === movie.id) &&
        movie.poster_path &&
        (movie.original_language === 'ko' || movie.origin_country?.includes('KR'))
      )
      .slice(0, 10); // 10개 제한

    console.log(`지정 감독 한국 영화 ${uniqueKoreanMovies.length}개 발견`);

    // 영화가 부족한 경우 기본 한국 영화로 보완 (감독 필터 적용)
    if (uniqueKoreanMovies.length < 8) {
      const additionalMovies = await fetchMovies('/discover/movie', {
        with_original_language: 'ko',
        'primary_release_date.gte': '2000-01-01',
        sort_by: 'popularity.desc',
        region: 'KR',
        'certification_country': 'KR',
        'certification.lte': '15' // 19금 제외
      });

      // 추가 감독 필터 적용
      for (const movie of additionalMovies.slice(0, 5)) {
        try {
          const movieDetails = await fetchMovieDetails(movie.id);

          if (
            movieDetails &&
            movieDetails.adult === false &&
            movieDetails.credits?.crew?.some(person =>
              person.job === 'Director' &&
              KOREAN_DIRECTORS.some(director => person.name.includes(director))
            )
          ) {
            uniqueKoreanMovies.push(movieDetails);
          }

          await new Promise(resolve => setTimeout(resolve, 150));
        } catch (error) {
          console.error('추가 영화 정보 가져오기 실패:', error);
        }

        if (uniqueKoreanMovies.length >= 10) break;
      }
    }

    return uniqueKoreanMovies.slice(0, 10);
  } catch (error) {
    console.error('지정 감독 한국 영화 검색 실패:', error);
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

// 히어로 슬라이드 생성
function createHeroSlide(movie, isPreview = false) {
  const backdropUrl = movie.backdrop_path
    ? `${IMAGE_BASE_URL}/w1280${movie.backdrop_path}`
    : (movie.poster_path
        ? `${IMAGE_BASE_URL}/w1280${movie.poster_path}`
        : 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTI4MCIgaGVpZ2h0PSI3MjAiIHZpZXdCb3g9IjAgMCAxMjgwIDcyMCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjEyODAiIGhlaWdodD0iNzIwIiBmaWxsPSIjMWQxZDFkIi8+Cjx0ZXh0IHg9IjY0MCIgeT0iMzYwIiBmaWxsPSIjYmRiZGJkIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmb250LXNpemU9IjI0IiBmb250LXdlaWdodD0iYm9sZCI+Tm8gSW1hZ2U8L3RleHQ+Cjwvc3ZnPgo=');

  const year = movie.release_date ? new Date(movie.release_date).getFullYear() : '';
  const country = getCountryFlag(movie);
  const rating = movie.vote_average ? movie.vote_average.toFixed(1) : 'N/A';

  const slideClass = isPreview ? 'hero-slide preview' : 'hero-slide';

  // 로고 이미지 타이틀 변경
  const hasLogo = movie.title === '어쩔 수 없다' || movie.title === 'F1' || movie.title === '원배틀에프터어나더' || movie.title === '모노노케 히메';
  let logoSrc = '';
  if (movie.title === '어쩔 수 없다') {
    logoSrc = 'img/어쩔수가없다_logo.png';
  } else if (movie.title === 'F1') {
    logoSrc = 'img/F1_logo.png';
  } else if (movie.title === '원배틀에프터어나더') {
    logoSrc = 'img/원배틀에프터어나더_logo.png';
  } else if (movie.title === '모노노케 히메') {
    logoSrc = 'img/모노노케히메_logo.png';
  }

  const overlayContent = isPreview
    ? ''
    : `
        <div class="hero-overlay">
          <div class="hero-meta">
            <span class="hero-country">${country}</span>
            <span class="hero-year">${year}</span>
            <span class="hero-genre">⭐ ${rating}</span>
          </div>
          ${hasLogo 
            ? `<img src="${logoSrc}" alt="${movie.title}" class="hero-title-logo" onerror="this.style.display='none'; this.nextElementSibling.style.display='block';">
               <div class="hero-title" style="display: none;">${movie.title}</div>`
            : `<div class="hero-title">${movie.title}</div>`
          }
        </div>
      `;

  return `
    <div class="${slideClass}" data-movie-id="${movie.id}">
      <img src="${backdropUrl}" alt="${movie.title}" class="hero-bg">
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

// 미리보기 업데이트 함수
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

  previewPoster.src = posterUrl;
  previewPoster.alt = nextMovie.title;
  previewTitle.textContent = nextMovie.title;
  previewSubtitle.textContent = nextMovie.overview || '곧 만나볼 수 있는 새로운 영화입니다.';
}

// 슬라이더 데이터 로드
async function loadSlider(sliderId, dataType, isHero = false) {
  const slidesContainer = document.getElementById(sliderId);
  let movies = [];

  try {
    switch (dataType) {
      case 'trending':
        movies = await fetchTrendingMovies();
        break;
      case 'korean':
        movies = await fetchKoreanMovies(); // 새로운 한국 영화 함수 사용
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
      case 'main_slider':
        // 메인 슬라이더는 지정된 영화들만 표시
        movies = await fetchMainSliderMovies();
        break;
      default:
        movies = await fetchMoviesByRegion('KR');
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
        .filter(movie => movie.poster_path)
        .map(movie => createPosterCard(movie))
        .join('');
    }
  } catch (error) {
    console.error(`${sliderId} 로드 실패:`, error);
    slidesContainer.innerHTML = '<div class="error">로딩 중 오류가 발생했습니다</div>';
  }
}