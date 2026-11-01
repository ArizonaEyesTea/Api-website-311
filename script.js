// PokéRank - gets Pokémon information from PokéAPI

const API_BASE = 'https://pokeapi.co/api/v2';
const POKEMON_LIMIT = 20;

// Get the parts of the page we need
const leaderboardElement = document.querySelector('#leaderboard');
const messageElement = document.querySelector('#message');
const searchForm = document.querySelector('#search-form');
const searchInput = document.querySelector('#pokemon-search');
const searchResultSection = document.querySelector('#search-result-section');
const searchResultElement = document.querySelector('#search-result');
const clearSearchButton = document.querySelector('#clear-search');
const sortSelect = document.querySelector('#sort-select');

let pokemonList = [];
let pokemonCache = {};

// Names for the stats
const STAT_NAMES = {
    hp: 'HP',
    attack: 'ATK',
    defense: 'DEF',
    'special-attack': 'SP.ATK',
    'special-defense': 'SP.DEF',
    speed: 'SPD'
};

// Show a message on the page
function showMessage(message, type) {
    messageElement.textContent = message;
    messageElement.className = 'message ' + (type || '');
    messageElement.classList.remove('hidden');
}

// Hide the message
function hideMessage() {
    messageElement.classList.add('hidden');
}

// Get information about one Pokémon
async function getPokemon(nameOrId) {
    let key = String(nameOrId).toLowerCase().trim();

    // Check if we already have this Pokémon saved
    if (pokemonCache[key]) {
        return pokemonCache[key];
    }

    const response = await fetch(API_BASE + '/pokemon/' + encodeURIComponent(key));

    if (!response.ok) {
        if (response.status === 404) {
            throw new Error('We could not find a Pokémon named "' + nameOrId + '". Check the spelling and try again.');
        }

        throw new Error('The Pokémon API could not complete the request. Please try again.');
    }

    const data = await response.json();

    // Get the Pokémon image
    let image = data.sprites.front_default;

    if (data.sprites.other && data.sprites.other['official-artwork']) {
        image = data.sprites.other['official-artwork'].front_default || image;
    }

    // Make an object to hold the Pokémon information
    let pokemon = {
        id: data.id,
        name: data.name,
        image: image,
        types: [],
        stats: {},
        total: 0
    };

    // Add the Pokémon types
    for (let i = 0; i < data.types.length; i++) {
        pokemon.types.push(data.types[i].type.name);
    }

    // Add up all the base stats
    for (let i = 0; i < data.stats.length; i++) {
        let statName = data.stats[i].stat.name;
        let statValue = data.stats[i].base_stat;

        pokemon.stats[statName] = statValue;
        pokemon.total = pokemon.total + statValue;
    }

    // Save the Pokémon so we do not have to fetch it again
    pokemonCache[key] = pokemon;
    pokemonCache[String(data.id)] = pokemon;
    pokemonCache[data.name] = pokemon;

    return pokemon;
}

// Load the first 20 Pokémon
async function loadLeaderboard() {
    showMessage('Loading the first 20 Pokémon and retrieving their base stats...');

    try {
        const response = await fetch(API_BASE + '/pokemon?limit=' + POKEMON_LIMIT + '&offset=0');

        if (!response.ok) {
            throw new Error('Could not load the Pokémon list. Please try again later.');
        }

        const listData = await response.json();

        pokemonList = [];

        // Get the information for each Pokémon
        for (let i = 0; i < listData.results.length; i++) {
            let pokemon = await getPokemon(listData.results[i].name);
            pokemonList.push(pokemon);
        }

        updateSummary();
        renderLeaderboard();

        showMessage('Pokémon data loaded successfully.', 'success');

        setTimeout(function() {
            messageElement.classList.add('hidden');
        }, 2500);

    } catch (error) {
        showMessage(error.message || 'Something went wrong while loading Pokémon data.', 'error');

        leaderboardElement.innerHTML =
            '<div class="empty-state">The leaderboard could not be loaded. Please refresh the page to try again.</div>';
    }
}

// Update the numbers above the leaderboard
function updateSummary() {
    let highest = null;

    for (let i = 0; i < pokemonList.length; i++) {
        if (highest === null || pokemonList[i].total > highest.total) {
            highest = pokemonList[i];
        }
    }

    document.querySelector('#pokemon-count').textContent = pokemonList.length;
    document.querySelector('#top-total').textContent = highest ? highest.total : '--';
    document.querySelector('#top-name').textContent = highest ? highest.name : 'Highest combined base stats';
    document.querySelector('#result-count').textContent = pokemonList.length + ' Pokémon';
}

// Create a card for a Pokémon
function createPokemonCard(pokemon, rank) {
    const card = document.createElement('article');
    card.className = 'pokemon-card';

    // Pokémon image
    const art = document.createElement('div');
    art.className = 'pokemon-art';

    if (pokemon.image) {
        const image = document.createElement('img');
        image.src = pokemon.image;
        image.alt = pokemon.name + ' artwork';
        image.loading = 'lazy';
        art.appendChild(image);
    } else {
        art.textContent = 'No image';
    }

    const info = document.createElement('div');
    info.className = 'pokemon-info';

    // Rank and Pokémon number
    const topLine = document.createElement('div');
    topLine.className = 'card-topline';

    const rankLabel = document.createElement('span');
    rankLabel.className = 'rank';

    if (rank) {
        rankLabel.textContent = 'RANK #' + String(rank).padStart(2, '0');
    } else {
        rankLabel.textContent = 'SEARCH RESULT';
    }

    const idLabel = document.createElement('span');
    idLabel.className = 'pokemon-id';
    idLabel.textContent = '#' + String(pokemon.id).padStart(3, '0');

    topLine.appendChild(rankLabel);
    topLine.appendChild(idLabel);

    // Pokémon name
    const name = document.createElement('h3');
    name.className = 'pokemon-name';
    name.textContent = pokemon.name;

    // Pokémon types
    const typeList = document.createElement('div');
    typeList.className = 'type-list';

    for (let i = 0; i < pokemon.types.length; i++) {
        const pill = document.createElement('span');
        pill.className = 'type-pill';
        pill.textContent = pokemon.types[i];
        typeList.appendChild(pill);
    }

    // Total base stats
    const totalLine = document.createElement('div');
    totalLine.className = 'total-line';

    const totalLabel = document.createElement('span');
    totalLabel.textContent = 'TOTAL BASE STATS';

    const totalValue = document.createElement('strong');
    totalValue.textContent = pokemon.total;

    totalLine.appendChild(totalLabel);
    totalLine.appendChild(totalValue);

    // Make the stat bars
    const statBars = document.createElement('div');
    statBars.className = 'stat-bars';

    for (let stat in STAT_NAMES) {
        let value = pokemon.stats[stat];

        const statItem = document.createElement('div');
        statItem.className = 'stat-item';

        const statLabel = document.createElement('div');
        statLabel.className = 'stat-label';

        const statName = document.createElement('span');
        statName.textContent = STAT_NAMES[stat];

        const statValue = document.createElement('b');
        statValue.textContent = value;

        statLabel.appendChild(statName);
        statLabel.appendChild(statValue);

        const track = document.createElement('div');
        track.className = 'stat-track';

        const fill = document.createElement('div');
        fill.className = 'stat-fill';

        fill.style.width = Math.min((value / 255) * 100, 100) + '%';

        track.appendChild(fill);
        statItem.appendChild(statLabel);
        statItem.appendChild(track);
        statBars.appendChild(statItem);
    }

    // Put everything together
    info.appendChild(topLine);
    info.appendChild(name);
    info.appendChild(typeList);
    info.appendChild(totalLine);
    info.appendChild(statBars);

    card.appendChild(art);
    card.appendChild(info);

    return card;
}

// Sort the Pokémon and display them
function renderLeaderboard() {
    let selectedStat = sortSelect.value;
    let sortedPokemon = pokemonList.slice();

    sortedPokemon.sort(function(a, b) {
        if (selectedStat === 'total') {
            return b.total - a.total;
        }

        if (b.stats[selectedStat] !== a.stats[selectedStat]) {
            return b.stats[selectedStat] - a.stats[selectedStat];
        }

        return b.total - a.total;
    });

    leaderboardElement.innerHTML = '';

    for (let i = 0; i < sortedPokemon.length; i++) {
        let card = createPokemonCard(sortedPokemon[i], i + 1);
        leaderboardElement.appendChild(card);
    }
}

// Search for a Pokémon
async function searchPokemon(event) {
    event.preventDefault();

    let query = searchInput.value.trim();

    if (query === '') {
        showMessage('Enter a Pokémon name to search.', 'error');
        searchInput.focus();
        return;
    }

    showMessage('Searching for ' + query + '...');

    try {
        let pokemon = await getPokemon(query);

        searchResultElement.innerHTML = '';
        searchResultElement.appendChild(createPokemonCard(pokemon));

        searchResultSection.classList.remove('hidden');
        document.querySelector('#leaderboard-section').classList.add('hidden');

        hideMessage();

    } catch (error) {
        searchResultSection.classList.add('hidden');
        document.querySelector('#leaderboard-section').classList.remove('hidden');

        showMessage(error.message, 'error');
    }
}

// Clear the search and return to the leaderboard
function clearSearch() {
    searchInput.value = '';
    searchResultElement.innerHTML = '';

    searchResultSection.classList.add('hidden');
    document.querySelector('#leaderboard-section').classList.remove('hidden');

    hideMessage();
}

// Set up the buttons and dropdown
searchForm.addEventListener('submit', searchPokemon);
clearSearchButton.addEventListener('click', clearSearch);
sortSelect.addEventListener('change', renderLeaderboard);

// Load the leaderboard when the page opens
loadLeaderboard();