// Frontend JS
async function searchRecipes() {
    const query = document.getElementById("search").value;

    const response = await fetch(`http://localhost:3000/api/recipes?q=${query}`);
    const data = await response.json();

    const results = document.getElementById("results");
    results.innerHTML = "";

    data.results.forEach(recipe => {
        results.innerHTML += `
            <div class="recipe">
                <h2>${recipe.title}</h2>
                <img src="${recipe.image}" width="200" />
            </div>
        `;
    });
}
