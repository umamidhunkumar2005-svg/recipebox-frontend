// Wake up Vercel!
import React, { useState, useEffect } from 'react';
import './App.css';

function App() {
  const [recipes, setRecipes] = useState([]);
  const [token, setToken] = useState(sessionStorage.getItem('token') || '');
  const [isRegistering, setIsRegistering] = useState(false);
  
  // 🌟 State can now be 'vault', 'feed', 'explore', OR 'chefProfile'
  const [viewMode, setViewMode] = useState('vault');
  const [searchQuery, setSearchQuery] = useState('');
  
  const [followedChefs, setFollowedChefs] = useState([]);
  // 🌟 NEW: Store the specific profile we are looking at
  const [selectedChefProfile, setSelectedChefProfile] = useState(null); 

  // DYNAMIC PAYLOAD EXTRACTOR
  const getUserDetails = () => {
    if (!token) return { username: 'Guest Chef', email: 'Not Logged In', id: null };
    try {
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
      }).join(''));
      
      const decoded = JSON.parse(jsonPayload);
      return {
        username: decoded.username || decoded.user?.username || 'Active Chef',
        email: decoded.email || decoded.user?.email || 'No Email Verified',
        id: decoded.id || decoded.user?.id || null 
      };
    } catch (e) {
      return { username: 'Active Chef', email: 'Connected Securely', id: null };
    }
  };

  const userProfile = getUserDetails();
  const [authData, setAuthData] = useState({ username: '', email: '', password: '' });
  
  const [formData, setFormData] = useState({
    title: '', description: '', prepTimeMinutes: '', imageUrl: ''
  });
  
  const [ingredientsText, setIngredientsText] = useState('');
  const [instructionsText, setInstructionsText] = useState('');
  const [tags, setTags] = useState('');
  const [reviewData, setReviewData] = useState({});

  // 🔒 FETCH PRIVATE VAULT
  const fetchVaultRecipes = () => {
    fetch('https://recipebox-api-yz4h.onrender.com/api/recipes', { 
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(response => {
        if (!response.ok) throw new Error("Unauthorized or server error");
        return response.json();
      })
      .then(data => {
        setRecipes(data);
        setViewMode('vault');
      })
      .catch(error => console.error("Error fetching data:", error));
  };

  // 🌐 FETCH SOCIAL FEED
  const fetchSocialFeed = () => {
    fetch('https://recipebox-api-yz4h.onrender.com/api/recipes/feed', { 
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => {
        setRecipes(data);
        setViewMode('feed');
      })
      .catch(error => console.error("Error fetching feed:", error));

    fetch('https://recipebox-api-yz4h.onrender.com/api/users/following', { 
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => {
        if(Array.isArray(data)) setFollowedChefs(data);
      })
      .catch(error => console.error("Error fetching chefs:", error));
  };

  // 🔍 FETCH EXPLORE FEED
  const fetchExploreRecipes = () => {
    fetch('https://recipebox-api-yz4h.onrender.com/api/recipes/explore', { 
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(response => {
        if (!response.ok) throw new Error("Explore fetch failed");
        return response.json();
      })
      .then(data => {
        setRecipes(data);
        setViewMode('explore');
      })
      .catch(error => console.error("Error fetching explore feed:", error));
  };

  // 🌟 NEW: FETCH SINGLE CHEF PROFILE
  const fetchChefProfile = (chefId) => {
    // We run two fetches at the exact same time: one for the Profile Data, one for the Recipes
    Promise.all([
      fetch(`https://recipebox-api-yz4h.onrender.com/api/users/${chefId}`, { headers: { 'Authorization': `Bearer ${token}` } }).then(res => res.json()),
      fetch(`https://recipebox-api-yz4h.onrender.com/api/recipes/chef/${chefId}`, { headers: { 'Authorization': `Bearer ${token}` } }).then(res => res.json())
    ])
    .then(([profileData, recipesData]) => {
      setSelectedChefProfile(profileData);
      setRecipes(recipesData);
      setViewMode('chefProfile');
    })
    .catch(error => console.error("Error fetching chef profile:", error));
  };

  // 🔎 SEARCH RECIPES
  const handleSearch = (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return; 

    fetch(`https://recipebox-api-yz4h.onrender.com/api/recipes/search?query=${searchQuery}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
    .then(response => {
      if (!response.ok) throw new Error("Search failed");
      return response.json();
    })
    .then(data => {
      setRecipes(data);
      setViewMode('explore'); 
    })
    .catch(error => console.error("Error searching:", error));
  };

  useEffect(() => {
    if (token) fetchVaultRecipes();
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
        sessionStorage.setItem('token', data.token);
        setToken(data.token);
        setAuthData({ username: '', email: '', password: '' });
      } else {
        alert(isRegistering ? "Registration successful! Please log in." : "Login failed.");
        if (isRegistering) setIsRegistering(false);
      }
    })
    .catch(error => alert("Error: Check your credentials or server connection."));
  };

  const handleLogout = () => {
    sessionStorage.removeItem('token');
    setToken('');
    setRecipes([]);
    window.location.reload(); 
  };

  const handleDelete = (id) => {
    if (window.confirm("Are you sure you want to delete this recipe?")) {
      fetch(`https://recipebox-api-yz4h.onrender.com/api/recipes/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      })
      .then(async response => {
        if (response.ok) {
          fetchVaultRecipes(); 
        } else {
          const errorData = await response.json();
          alert(`Backend says: ${errorData.message}`);
        }
      })
      .catch(error => alert("Server connection failed. Is the backend running?"));
    }
  };

  const handleFollow = (targetChefId, targetUsername) => {
    fetch(`https://recipebox-api-yz4h.onrender.com/api/users/${targetChefId}/follow`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` }
    })
    .then(res => {
      if (!res.ok) throw new Error("Follow action failed");
      return res.json();
    })
    .then(data => {
      alert(data.message); 
      // Refresh whichever view we are currently looking at
      if (viewMode === 'explore') fetchExploreRecipes();
      else if (viewMode === 'feed') fetchSocialFeed();
      else if (viewMode === 'chefProfile') fetchChefProfile(targetChefId); // Refresh profile stats!
      else fetchVaultRecipes();
    })
    .catch(err => {
      console.error(err);
      alert("Failed to follow chef.");
    });
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
      fetchVaultRecipes(); 
      setFormData({ title: '', description: '', prepTimeMinutes: '', imageUrl: '' });
      setIngredientsText('');
      setInstructionsText('');
      setTags('');
    })
    .catch(error => alert("Submission error. Check your console logs."));
  };

  const handleReviewSubmit = (e, recipeId) => {
    e.preventDefault();
    const review = reviewData[recipeId];
    if (!review || !review.comment) return;

    fetch(`https://recipebox-api-yz4h.onrender.com/api/recipes/${recipeId}/reviews`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ rating: review.rating || 5, comment: review.comment })
    })
    .then(res => res.json())
    .then(() => {
      if (viewMode === 'explore') fetchExploreRecipes();
      else if (viewMode === 'feed') fetchSocialFeed();
      else if (viewMode === 'chefProfile') fetchChefProfile(selectedChefProfile._id);
      else fetchVaultRecipes();
      
      setReviewData(prev => ({ ...prev, [recipeId]: { rating: 5, comment: '' } })); 
    });
  };

  const handleReviewChange = (recipeId, field, value) => {
    setReviewData(prev => ({
      ...prev,
      [recipeId]: { ...prev[recipeId], [field]: value }
    }));
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
      {/* HEADER SECTION */}
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
          {viewMode === 'vault' && "🔒 My Private Recipe Vault"}
          {viewMode === 'feed' && "🌐 My Social Feed"}
          {viewMode === 'explore' && "🔍 Explore Global Recipes"}
          {viewMode === 'chefProfile' && "🧑‍🍳 Chef Profile"}
        </h2>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          
          <div style={{ display: 'flex', gap: '10px' }}>
             <button 
                onClick={fetchVaultRecipes}
                style={{
                  padding: '8px 15px', backgroundColor: viewMode === 'vault' ? '#00a86b' : '#e2e8f0',
                  color: viewMode === 'vault' ? 'white' : '#4a5568', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold'
                }}
             >
               My Vault
             </button>
             <button 
                onClick={fetchSocialFeed}
                style={{
                  padding: '8px 15px', backgroundColor: viewMode === 'feed' ? '#00a86b' : '#e2e8f0',
                  color: viewMode === 'feed' ? 'white' : '#4a5568', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold'
                }}
             >
               Social Feed
             </button>
             <button 
                onClick={fetchExploreRecipes}
                style={{
                  padding: '8px 15px', backgroundColor: viewMode === 'explore' ? '#00a86b' : '#e2e8f0',
                  color: viewMode === 'explore' ? 'white' : '#4a5568', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold'
                }}
             >
               Explore
             </button>
          </div>

          <div style={{ textAlign: 'right', borderRight: '2px solid #edf2f7', paddingRight: '20px', paddingLeft: '20px' }}>
            <span style={{ display: 'block', fontSize: '10px', color: '#a0aec0', textTransform: 'uppercase', fontWeight: 'bold' }}>
              Authenticated User
            </span>
            <div style={{ fontWeight: '700', color: '#2d3748', fontSize: '15px' }}>
              @{userProfile.username}
            </div>
          </div>
          
          <button 
            onClick={handleLogout}
            style={{
              padding: '10px 18px', backgroundColor: '#dc2626', color: 'white',
              border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '600'
            }}
          >
            Log Out
          </button>
        </div>
      </div>

      {viewMode === 'explore' && (
        <div style={{ padding: '0 30px', marginBottom: '20px' }}>
          <form onSubmit={handleSearch} style={{ display: 'flex', gap: '10px', maxWidth: '600px', margin: '0 auto' }}>
            <input 
              type="text" 
              placeholder="Search for a recipe title or ingredient..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ flex: 1, padding: '12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '16px' }}
            />
            <button 
              type="submit" 
              style={{ padding: '12px 24px', backgroundColor: '#3182ce', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}
            >
              Search
            </button>
            <button 
              type="button" 
              onClick={() => { setSearchQuery(''); fetchExploreRecipes(); }} 
              style={{ padding: '12px 16px', backgroundColor: '#e2e8f0', color: '#4a5568', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
            >
              Clear
            </button>
          </form>
        </div>
      )}

      {/* HORIZONTAL PROFILES LIST (SOCIAL FEED) */}
      {viewMode === 'feed' && followedChefs.length > 0 && (
        <div style={{ padding: '0 30px', marginBottom: '25px' }}>
          <h3 style={{ color: '#2d3748', margin: '0 0 15px 0', fontSize: '18px' }}>Chefs You Follow</h3>
          
          <div style={{ display: 'flex', gap: '25px', overflowX: 'auto', paddingBottom: '10px' }}>
            {followedChefs.map(chef => (
              <div 
                key={chef._id} 
                onClick={() => fetchChefProfile(chef._id)} // 🌟 NEW: Clicking Avatar loads Profile!
                style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: '80px', cursor: 'pointer' }}
              >
                <img 
                  src={chef.profilePicture || "https://cdn-icons-png.flaticon.com/512/149/149071.png"} 
                  alt={chef.username}
                  style={{ width: '70px', height: '70px', borderRadius: '50%', objectFit: 'cover', border: '3px solid #00a86b', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}
                  onError={(e) => { e.target.src = "https://cdn-icons-png.flaticon.com/512/149/149071.png"; }}
                />
                <span style={{ fontSize: '13px', fontWeight: 'bold', marginTop: '8px', color: '#4a5568' }}>
                  @{chef.username}
                </span>
              </div>
            ))}
          </div>
          <hr style={{ marginTop: '15px', borderTop: '1px solid #edf2f7' }} />
        </div>
      )}

      {/* 🌟 NEW: DEDICATED CHEF PROFILE HEADER */}
      {viewMode === 'chefProfile' && selectedChefProfile && (
        <div style={{ margin: '0 30px 30px 30px', padding: '30px', backgroundColor: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0', textAlign: 'center', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
           <img 
              src={selectedChefProfile.profilePicture || "https://cdn-icons-png.flaticon.com/512/149/149071.png"} 
              alt={selectedChefProfile.username}
              style={{ width: '120px', height: '120px', borderRadius: '50%', objectFit: 'cover', border: '4px solid #00a86b', marginBottom: '15px' }}
           />
           <h2 style={{ margin: '0 0 10px 0', color: '#1a202c', fontSize: '28px' }}>@{selectedChefProfile.username}</h2>
           <p style={{ margin: '0 auto 20px auto', color: '#4a5568', fontStyle: 'italic', maxWidth: '600px', fontSize: '16px' }}>
              {selectedChefProfile.bio || "This chef prefers to let their food do the talking. No bio yet!"}
           </p>

           <div style={{ display: 'flex', justifyContent: 'center', gap: '30px', marginBottom: '25px', fontSize: '18px' }}>
              <div><strong style={{ color: '#2d3748' }}>{selectedChefProfile.followers?.length || 0}</strong> Followers</div>
              <div><strong style={{ color: '#2d3748' }}>{selectedChefProfile.following?.length || 0}</strong> Following</div>
              <div><strong style={{ color: '#2d3748' }}>{recipes.length}</strong> Recipes</div>
           </div>

           {selectedChefProfile._id !== userProfile.id && (
             <button 
               onClick={() => handleFollow(selectedChefProfile._id, selectedChefProfile.username)}
               style={{ padding: '12px 30px', backgroundColor: selectedChefProfile.followers?.includes(userProfile.id) ? '#e2e8f0' : '#3182ce', color: selectedChefProfile.followers?.includes(userProfile.id) ? '#4a5568' : 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '16px' }}
             >
               {selectedChefProfile.followers?.includes(userProfile.id) ? 'Following' : 'Follow Chef'}
             </button>
           )}
        </div>
      )}

      {viewMode === 'vault' && (
        <form className="recipe-form comprehensive-form" onSubmit={handleSubmit}>
          <h3>Add New Comprehensive Recipe</h3>
          <input name="title" placeholder="Recipe Title" value={formData.title} onChange={handleChange} required />
          <input name="prepTimeMinutes" type="number" placeholder="Prep Time (mins)" value={formData.prepTimeMinutes} onChange={handleChange} required />
          <input name="imageUrl" placeholder="Image URL (e.g. https://...jpg)" value={formData.imageUrl} onChange={handleChange} required={false} />
          <textarea name="description" placeholder="Brief Summary/Description" value={formData.description} onChange={handleChange} required />
          
          <div className="form-section">
            <h4>Ingredients Blueprint</h4>
            <textarea placeholder="Example:&#10;200g Pasta&#10;2 Eggs" rows="3" value={ingredientsText} onChange={(e) => setIngredientsText(e.target.value)} required />
          </div>

          <div className="form-section">
            <h4>Preparation Steps</h4>
            <textarea placeholder="Example:&#10;Boil the water&#10;Cook the pasta" rows="3" value={instructionsText} onChange={(e) => setInstructionsText(e.target.value)} required />
          </div>

          <div className="form-section">
            <h4>Tags</h4>
            <input placeholder="Comma separated tags: Vegan, Dinner" value={tags} onChange={(e) => setTags(e.target.value)} />
          </div>

          <button type="submit" className="submit-main-btn">Publish Advanced Recipe</button>
        </form>
      )}

      {viewMode === 'vault' && <hr />}

      <div className="recipe-list">
        {recipes.length === 0 ? (
           <p className="loading-text">
             {viewMode === 'vault' && "Your vault is empty. Add a recipe above!"}
             {viewMode === 'feed' && "Your feed is empty. Follow some chefs in the Explore tab!"}
             {viewMode === 'explore' && "There are no other recipes on the platform right now!"}
             {viewMode === 'chefProfile' && "This chef hasn't posted any recipes yet!"}
           </p>
        ) : null}
        
        {recipes.map(recipe => {
          const authorId = typeof recipe.author === 'object' ? recipe.author._id : recipe.author;
          const isOwner = authorId === userProfile.id;

          return (
            <div key={recipe._id} className="recipe-card">
              <div className="recipe-image-container">
                <img 
                  src={recipe.imageUrl || "https://images.pexels.com/photos/1640777/pexels-photo-1640777.jpeg?auto=compress&cs=tinysrgb&w=600"} 
                  alt={recipe.title}
                  className="recipe-image"
                  onError={(e) => { e.target.src = "https://images.pexels.com/photos/1640777/pexels-photo-1640777.jpeg?auto=compress&cs=tinysrgb&w=600"; }}
                />
              </div>

              <div className="recipe-content">
                <h2>{recipe.title}</h2>
                <div className="recipe-info">
                  <p><strong>Prep time:</strong> {recipe.prepTimeMinutes} mins</p>
                  <p className="description">{recipe.description}</p>
                  
                  {recipe.ingredients && recipe.ingredients.length > 0 && (
                    <div className="rendered-data-block">
                      <h5>Ingredients Needed:</h5>
                      <ul className="mini-render-list">
                        {recipe.ingredients.map((ing, i) => <li key={i}>{ing.name}</li>)}
                      </ul>
                    </div>
                  )}

                  {recipe.instructions && recipe.instructions.length > 0 && (
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
                </div>

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
                    <select value={reviewData[recipe._id]?.rating || 5} onChange={(e) => handleReviewChange(recipe._id, 'rating', e.target.value)} style={{ padding: '6px' }}>
                      <option value="5">⭐⭐⭐⭐⭐</option>
                      <option value="4">⭐⭐⭐⭐</option>
                      <option value="3">⭐⭐⭐</option>
                      <option value="2">⭐⭐</option>
                      <option value="1">⭐</option>
                    </select>
                    <input type="text" placeholder="Leave a comment..." value={reviewData[recipe._id]?.comment || ''} onChange={(e) => handleReviewChange(recipe._id, 'comment', e.target.value)} style={{ width: '50%', padding: '6px' }} required />
                    <button type="submit" style={{ padding: '6px', backgroundColor: '#00a86b', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Post</button>
                  </form>
                </div>

                <div className="card-footer" style={{ marginTop: '15px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  {/* 🌟 NEW: Clicking the author name on any card now opens their profile! */}
                  <span 
                    className="chef-name" 
                    onClick={() => fetchChefProfile(authorId)}
                    style={{ fontWeight: 'bold', color: '#3182ce', cursor: 'pointer', textDecoration: 'underline' }}
                  >
                    Chef: @{recipe.author?.username || 'Unknown'}
                  </span>
                  
                  <div style={{ display: 'flex', gap: '10px' }}>
                    {isOwner ? (
                      <button className="delete-btn" onClick={() => handleDelete(recipe._id)}>Delete Post</button>
                    ) : (
                      <button 
                        onClick={() => handleFollow(authorId, recipe.author?.username)}
                        style={{ padding: '8px 12px', backgroundColor: '#3182ce', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
                      >
                        Follow Chef
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default App;
