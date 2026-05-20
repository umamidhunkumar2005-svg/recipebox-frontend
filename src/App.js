import React, { useState, useEffect } from 'react';
import './App.css';

function App() {
  const [recipes, setRecipes] = useState([]);
  const [token, setToken] = useState(localStorage.getItem('token') || '');
  const [isRegistering, setIsRegistering] = useState(false);
  
  // DYNAMIC PAYLOAD EXTRACTOR
  // Safely parses the JWT token to fetch the logged-in user's true data fields
  const getUserDetails = () => {
    if (!token) return { username: 'Guest Chef', email: 'Not Logged In' };
    try {
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
      }).join(''));
      
      const decoded = JSON.parse(jsonPayload);
      console.log("Verified Profile Token Payload:", decoded); // Open browser console (F12) to audit this!
      
      return {
        username: decoded.username || decoded.user?.username || 'Active Chef',
        email: decoded.email || decoded.user?.email || 'No Email Verified'
      };
    } catch (e) {
      return { username: 'Active Chef', email: 'Connected Securely' };
    }
  };

  const userProfile = getUserDetails();

  // Auth Form State
  const [authData, setAuthData] = useState({ username: '', email: '', password: '' });
  
  // FORM PRODUCTION STATES
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    prepTimeMinutes: '',
    imageUrl: ''
  });
  
  const [ingredientsText, setIngredientsText] = useState('');
  const [instructionsText, setInstructionsText] = useState('');
  const [tags, setTags] = useState('');

  // PHASE 3: REVIEW STATE TRACKING
  const [reviewData, setReviewData] = useState({});

  const fetchRecipes = () => {
    fetch('https://recipebox-api-yz4h.onrender.com/api/recipes')
      .then(response => response.json())
      .then(data => setRecipes(data))
      .catch(error => console.error("Error fetching data:", error));
  };

  useEffect(() => {
    if (token) fetchRecipes();
  }, [token]);

  const handleAuthChange = (e) => setAuthData({ ...authData, [e.target.name]: e.target.value });
  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleAuthSubmit = (e) => {
    e.preventDefault();
    const endpoint = isRegistering ? 'register' : 'login';
    
    fetch(`https://recipebox-api-yz4h.onrender.com/api/auth/${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(authData)
    })
    .then(response => {
      if (!response.ok) throw new Error('Authentication failed');
      return response.json();
    })
    .then(data => {
      if (data.token) {
        localStorage.setItem('token', data.token);
        setToken(data.token);
        setAuthData({ username: '', email: '', password: '' });
      } else {
        alert(isRegistering ? "Registration successful! Please log in." : "Login failed.");
        if (isRegistering) setIsRegistering(false);
      }
    })
    .catch(error => {
      console.error("Auth Error:", error);
      alert("Error: Check your credentials or server connection.");
    });
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    setToken('');
    setRecipes([]);
    window.location.reload(); // Hard flush to break out of persistent states
  };

  const handleDelete = (id) => {
    if (window.confirm("Are you sure you want to delete this recipe?")) {
      fetch(`https://recipebox-api-yz4h.onrender.com/api/recipes/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      })
      .then(async response => {
        if (response.ok) {
          fetchRecipes(); 
        } else {
          const errorData = await response.json();
          alert(`Backend says: ${errorData.message}`);
        }
      })
      .catch(error => {
        console.error("Error:", error);
        alert("Server connection failed. Is the backend running?");
      });
    }
  };

  const handleTagClick = (tagWord) => {
    fetch(`https://recipebox-api-yz4h.onrender.com/api/recipes/search?tag=${tagWord}`)
      .then(res => {
        if (!res.ok) throw new Error("Tag filter failed");
        return res.json();
      })
      .then(data => setRecipes(data))
      .catch(err => console.error(err));
  };

  // PHASE 3: REVIEW HANDLERS
  const handleReviewChange = (recipeId, field, value) => {
    setReviewData(prev => ({
      ...prev,
      [recipeId]: { ...prev[recipeId], [field]: value }
    }));
  };

  const handleReviewSubmit = (e, recipeId) => {
    e.preventDefault();
    const review = reviewData[recipeId];
    if (!review || !review.comment) return;

    const finalReview = {
      rating: review.rating || 5,
      comment: review.comment
    };

    fetch(`https://recipebox-api-yz4h.onrender.com/api/recipes/${recipeId}/reviews`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(finalReview)
    })
    .then(res => {
      if(!res.ok) throw new Error("Failed to add review");
      return res.json();
    })
    .then(() => {
      fetchRecipes(); 
      setReviewData(prev => ({ ...prev, [recipeId]: { rating: 5, comment: '' } })); 
    })
    .catch(err => console.error(err));
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    const rawIngredients = ingredientsText.split('\n')
      .map(item => item.trim())
      .filter(item => item !== '')
      .map(item => ({ name: item, quantity: '1', unit: 'item' }));

    const rawInstructions = instructionsText.split('\n')
      .map(step => step.trim())
      .filter(step => step !== '');

    const processedTags = tags && typeof tags === 'string'
      ? tags.split(',').map(tag => tag.trim()).filter(tag => tag !== '')
      : [];

    const fullPayload = {
      title: formData.title,
      description: formData.description,
      prepTimeMinutes: Number(formData.prepTimeMinutes) || 0,
      imageUrl: formData.imageUrl || '',
      ingredients: rawIngredients,
      instructions: rawInstructions,
      tags: processedTags
    };

    fetch('https://recipebox-api-yz4h.onrender.com/api/recipes/create', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(fullPayload),
    })
    .then(response => {
      if (!response.ok) throw new Error('Failed to create');
      return response.json();
    })
    .then(() => {
      fetchRecipes();
      setFormData({ title: '', description: '', prepTimeMinutes: '', imageUrl: '' });
      setIngredientsText('');
      setInstructionsText('');
      setTags('');
    })
    .catch(error => {
      console.error("Error creating recipe:", error);
      alert("Submission error. Check your console logs.");
    });
  };

  if (!token) {
    return (
      <div className="auth-container">
        <form className="recipe-form" onSubmit={handleAuthSubmit}>
          <h2>{isRegistering ? "Create an Account" : "Welcome Back"}</h2>
          {isRegistering && (
            <input name="username" placeholder="Username" value={authData.username} onChange={handleAuthChange} required />
          )}
          <input name="email" type="email" placeholder="Email Address" value={authData.email} onChange={handleAuthChange} required />
          <input name="password" type="password" placeholder="Password" value={authData.password} onChange={handleAuthChange} required />
          <button type="submit">{isRegistering ? "Register" : "Sign In"}</button>
          <p className="auth-toggle-text" onClick={() => setIsRegistering(!isRegistering)}>
            {isRegistering ? "Already have an account? Sign In" : "Don't have an account? Register"}
          </p>
        </form>
      </div>
    );
  }

  return (
    <div className="App">
      {/* --- RE-ARCHITECTED DYNAMIC DETAILS HEADER --- */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '15px 30px',
        backgroundColor: '#ffffff',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
        marginBottom: '35px',
        borderRadius: '8px'
      }}>
        <h2 style={{ margin: 0, color: '#00a86b', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px' }}>
          🍳 My Recipe Box
        </h2>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <div style={{ textAlign: 'right', borderRight: '2px solid #edf2f7', paddingRight: '20px' }}>
            <span style={{ display: 'block', fontSize: '10px', color: '#a0aec0', textTransform: 'uppercase', fontWeight: 'bold', letterSpacing: '0.5px' }}>
              Authenticated User
            </span>
            <div style={{ fontWeight: '700', color: '#2d3748', fontSize: '15px' }}>
              @{userProfile.username}
            </div>
            <span style={{ fontSize: '12px', color: '#718096', fontStyle: 'italic' }}>
              {userProfile.email}
            </span>
          </div>
          
          <button 
            onClick={handleLogout}
            style={{
              padding: '10px 18px',
              backgroundColor: '#dc2626',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: '600',
              fontSize: '13px',
              boxShadow: '0 2px 4px rgba(220, 38, 38, 0.2)',
              transition: 'background-color 0.2s'
            }}
            onMouseOver={(e) => e.target.style.backgroundColor = '#b91c1c'}
            onMouseOut={(e) => e.target.style.backgroundColor = '#dc2626'}
          >
            Log Out / Clear Cache
          </button>
        </div>
      </div>

      <form className="recipe-form comprehensive-form" onSubmit={handleSubmit}>
        <h3>Add New Comprehensive Recipe</h3>
        <input name="title" placeholder="Recipe Title" value={formData.title} onChange={handleChange} required />
        <input name="prepTimeMinutes" type="number" placeholder="Prep Time (mins)" value={formData.prepTimeMinutes} onChange={handleChange} required />
        <input name="imageUrl" placeholder="Image URL (e.g. https://...jpg)" value={formData.imageUrl} onChange={handleChange} required={false} />
        <textarea name="description" placeholder="Brief Summary/Description" value={formData.description} onChange={handleChange} required />
        
        <div className="form-section">
          <h4>Ingredients Blueprint (One per line)</h4>
          <textarea 
            placeholder="Example:&#10;200g Pasta&#10;2 Eggs" 
            rows="3"
            value={ingredientsText} 
            onChange={(e) => setIngredientsText(e.target.value)} 
            required 
          />
        </div>

        <div className="form-section">
          <h4>Preparation Steps (One step per line)</h4>
          <textarea 
            placeholder="Example:&#10;Boil the water&#10;Cook the pasta" 
            rows="3"
            value={instructionsText} 
            onChange={(e) => setInstructionsText(e.target.value)} 
            required 
          />
        </div>

        <div className="form-section">
          <h4>Search Engine Discovery Tags</h4>
          <input placeholder="Comma separated tags: Vegan, Dinner, Gluten-Free" value={tags} onChange={(e) => setTags(e.target.value)} />
        </div>

        <button type="submit" className="submit-main-btn">Publish Advanced Recipe</button>
      </form>

      <hr />

      <div className="search-section-wrapper" style={{ maxWidth: '600px', margin: '30px auto', padding: '0 20px' }}>
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
          <input 
            type="text"
            placeholder="🔍 Search recipes by title or keyword..." 
            style={{ 
              width: '100%', padding: '12px 20px', fontSize: '16px', borderRadius: '30px', 
              border: '2px solid #00a86b', outline: 'none', boxShadow: '0 4px 6px rgba(0,0,0,0.05)'
            }}
            onChange={(e) => {
              const val = e.target.value;
              if (val.trim() === '') fetchRecipes();
              else {
                fetch(`https://recipebox-api-yz4h.onrender.com/api/recipes/search?query=${val}`)
                  .then(res => res.json())
                  .then(data => setRecipes(data))
                  .catch(err => console.error(err));
              }
            }}
          />
        </div>
      </div>

      <div className="recipe-list">
        {recipes.length === 0 ? <p className="loading-text">No recipes found. Add your first one above!</p> : null}
        
        {recipes.map(recipe => (
          <div key={recipe._id} className="recipe-card">
            <div className="recipe-image-container">
              <img 
                src={recipe.imageUrl || "https://images.pexels.com/photos/1640777/pexels-photo-1640777.jpeg?auto=compress&cs=tinysrgb&w=600"} 
                alt={recipe.title}
                className="recipe-image"
                onError={(e) => {
                  e.target.src = "https://images.pexels.com/photos/1640777/pexels-photo-1640777.jpeg?auto=compress&cs=tinysrgb&w=600";
                }}
              />
            </div>

            <div className="recipe-content">
              <h2>{recipe.title}</h2>
              <div className="recipe-info">
                <p><strong>Prep time:</strong> {recipe.prepTimeMinutes} mins</p>
                <p className="description">{recipe.description}</p>
                
                {recipe.ingredients && Array.isArray(recipe.ingredients) && recipe.ingredients.length > 0 && (
                  <div className="rendered-data-block">
                    <h5>Ingredients Needed:</h5>
                    <ul className="mini-render-list">
                      {recipe.ingredients.map((ing, i) => (
                        <li key={i}>{ing.name}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {recipe.instructions && Array.isArray(recipe.instructions) && recipe.instructions.length > 0 && (
                  <div className="rendered-data-block">
                    <h5>Steps to Cook:</h5>
                    <ol className="mini-render-list">
                      {recipe.instructions.map((step, i) => {
                        if (typeof step === 'object' && step !== null) return <li key={i}>{step.text || JSON.stringify(step)}</li>;
                        return <li key={i}>{step}</li>;
                      })}
                    </ol>
                  </div>
                )}

                {recipe.tags && Array.isArray(recipe.tags) && recipe.tags.length > 0 && (
                  <div className="tag-pill-container" style={{ marginTop: '10px', display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
                    {recipe.tags.map((tag, i) => (
                      <span 
                        key={i} 
                        className="tag-pill" 
                        style={{ cursor: 'pointer', transition: 'transform 0.1s' }} 
                        onClick={() => handleTagClick(tag)}
                        title={`Click to filter by #${tag}`}
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* --- REVIEWS & COMMENTS SECTION --- */}
              <div className="reviews-container" style={{ marginTop: '20px', paddingTop: '15px', borderTop: '1px solid #eee' }}>
                <h4 style={{ margin: '0 0 10px 0', fontSize: '15px', color: '#333' }}>
                  Comments & Ratings {recipe.reviews?.length > 0 ? `(${recipe.reviews.length})` : ''}
                </h4>
                
                {recipe.reviews && recipe.reviews.length > 0 ? (
                  <div className="review-list" style={{ maxHeight: '150px', overflowY: 'auto', marginBottom: '15px' }}>
                    {recipe.reviews.map((rev, i) => (
                      <div key={i} style={{ marginBottom: '10px', padding: '8px', backgroundColor: '#f9f9f9', borderRadius: '6px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <strong style={{ fontSize: '13px', color: '#00a86b' }}>@{rev.user}</strong>
                          <span style={{ fontSize: '12px' }}>{'⭐'.repeat(rev.rating)}</span>
                        </div>
                        <p style={{ margin: '5px 0 0 0', fontSize: '13px', color: '#555' }}>"{rev.comment}"</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p style={{ fontSize: '13px', color: '#888', fontStyle: 'italic' }}>No reviews yet. Be the first!</p>
                )}

                <form onSubmit={(e) => handleReviewSubmit(e, recipe._id)} style={{ display: 'flex', gap: '8px', marginTop: '10px', alignItems: 'center' }}>
                  <select 
                    value={reviewData[recipe._id]?.rating || 5}
                    onChange={(e) => handleReviewChange(recipe._id, 'rating', e.target.value)}
                    style={{ flexShrink: 0, padding: '6px', borderRadius: '4px', border: '1px solid #ccc', fontSize: '12px', cursor: 'pointer' }}
                  >
                    <option value="5">⭐⭐⭐⭐⭐</option>
                    <option value="4">⭐⭐⭐⭐</option>
                    <option value="3">⭐⭐⭐</option>
                    <option value="2">⭐⭐</option>
                    <option value="1">⭐</option>
                  </select>
                  
                  <input 
                    type="text" 
                    placeholder="Leave a comment..." 
                    value={reviewData[recipe._id]?.comment || ''}
                    onChange={(e) => handleReviewChange(recipe._id, 'comment', e.target.value)}
                    style={{ width: '50%', flexGrow: 1, padding: '6px', borderRadius: '4px', border: '1px solid #ccc', fontSize: '13px' }}
                    required
                  />
                  
                  <button type="submit" style={{ flexBasis: '60px', flexShrink: 0, padding: '6px 0', backgroundColor: '#00a86b', color: 'white', border: 'none', borderRadius: '4px', fontSize: '13px', cursor: 'pointer', textAlign: 'center' }}>
                    Post
                  </button>
                </form>
              </div>

              <div className="card-footer" style={{ marginTop: '15px' }}>
                <span className="chef-name">Chef: {recipe.author?.username || 'Unknown'}</span>
                <button className="delete-btn" onClick={() => handleDelete(recipe._id)}>Delete</button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default App;
