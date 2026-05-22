// Wake up Vercel!
import React, { useState, useEffect } from 'react';
import './App.css';

function App() {
  const [recipes, setRecipes] = useState([]);
  const [token, setToken] = useState(sessionStorage.getItem('token') || '');
  const [isRegistering, setIsRegistering] = useState(false);
  
  const [viewMode, setViewMode] = useState('vault');
  const [searchQuery, setSearchQuery] = useState('');
  
  const [followedChefs, setFollowedChefs] = useState([]);
  const [selectedChefProfile, setSelectedChefProfile] = useState(null); 

  // 🌟 State for the logged-in user's full database profile
  const [myFullProfile, setMyFullProfile] = useState(null);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profileFormData, setProfileFormData] = useState({ bio: '', profilePicture: '' });

  const getUserDetails = () => {
    if (!token) return { username: 'Guest', email: 'None', id: null };
    try {
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
      }).join(''));
      const decoded = JSON.parse(jsonPayload);
      return {
        username: decoded.username || decoded.user?.username,
        email: decoded.email || decoded.user?.email,
        id: decoded.id || decoded.user?.id
      };
    } catch (e) {
      return { username: 'Guest', email: 'None', id: null };
    }
  };

  const userProfile = getUserDetails();
  const [authData, setAuthData] = useState({ username: '', email: '', password: '' });
  
  const [formData, setFormData] = useState({ title: '', description: '', prepTimeMinutes: '', imageUrl: '' });
  const [ingredientsText, setIngredientsText] = useState('');
  const [instructionsText, setInstructionsText] = useState('');
  const [tags, setTags] = useState('');
  const [reviewData, setReviewData] = useState({});

  // 🌟 Fetch my full profile to show in the Sidebar
  const fetchMyProfile = () => {
    if (!userProfile.id) return;
    fetch(`https://recipebox-api-yz4h.onrender.com/api/users/${userProfile.id}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
    .then(res => res.json())
    .then(data => {
      setMyFullProfile(data);
      setProfileFormData({ bio: data.bio || '', profilePicture: data.profilePicture || '' });
    })
    .catch(err => console.error("Error fetching my profile:", err));
  };

  const fetchVaultRecipes = () => {
    fetch('https://recipebox-api-yz4h.onrender.com/api/recipes', { headers: { 'Authorization': `Bearer ${token}` }})
      .then(res => res.json())
      .then(data => { setRecipes(data); setViewMode('vault'); })
      .catch(err => console.error(err));
  };

  const fetchSocialFeed = () => {
    fetch('https://recipebox-api-yz4h.onrender.com/api/recipes/feed', { headers: { 'Authorization': `Bearer ${token}` }})
      .then(res => res.json())
      .then(data => { setRecipes(data); setViewMode('feed'); })
      .catch(err => console.error(err));

    fetch('https://recipebox-api-yz4h.onrender.com/api/users/following', { headers: { 'Authorization': `Bearer ${token}` }})
      .then(res => res.json())
      .then(data => { if(Array.isArray(data)) setFollowedChefs(data); })
      .catch(err => console.error(err));
  };

  const fetchExploreRecipes = () => {
    fetch('https://recipebox-api-yz4h.onrender.com/api/recipes/explore', { headers: { 'Authorization': `Bearer ${token}` }})
      .then(res => res.json())
      .then(data => { setRecipes(data); setViewMode('explore'); })
      .catch(err => console.error(err));
  };

  const fetchChefProfile = (chefId) => {
    Promise.all([
      fetch(`https://recipebox-api-yz4h.onrender.com/api/users/${chefId}`, { headers: { 'Authorization': `Bearer ${token}` } }).then(res => res.json()),
      fetch(`https://recipebox-api-yz4h.onrender.com/api/recipes/chef/${chefId}`, { headers: { 'Authorization': `Bearer ${token}` } }).then(res => res.json())
    ])
    .then(([profileData, recipesData]) => {
      setSelectedChefProfile(profileData);
      setRecipes(recipesData);
      setViewMode('chefProfile');
    })
    .catch(err => console.error("Error fetching chef profile:", err));
  };

  const handleSearch = (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return; 
    fetch(`https://recipebox-api-yz4h.onrender.com/api/recipes/search?query=${searchQuery}`, { headers: { 'Authorization': `Bearer ${token}` }})
    .then(res => res.json())
    .then(data => { setRecipes(data); setViewMode('explore'); })
    .catch(err => console.error(err));
  };

  // 🌟 Submit profile updates to the backend
  const handleProfileUpdateSubmit = (e) => {
    e.preventDefault();
    fetch('https://recipebox-api-yz4h.onrender.com/api/users/update-profile', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify(profileFormData)
    })
    .then(res => res.json())
    .then(updatedData => {
      setMyFullProfile(updatedData); // Update sidebar instantly
      setIsEditingProfile(false); // Close edit mode
    })
    .catch(err => alert("Failed to update profile"));
  };

  useEffect(() => {
    if (token) {
      fetchVaultRecipes();
      fetchMyProfile(); // Get sidebar data on load
    }
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
    .then(res => { if (!res.ok) throw new Error('Auth failed'); return res.json(); })
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
    .catch(err => alert("Error: Check your credentials."));
  };

  const handleLogout = () => {
    sessionStorage.removeItem('token');
    window.location.reload(); 
  };

  const handleDelete = (id) => {
    if (window.confirm("Are you sure you want to delete this recipe?")) {
      fetch(`https://recipebox-api-yz4h.onrender.com/api/recipes/${id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } })
      .then(async res => {
        if (res.ok) fetchVaultRecipes(); 
        else alert(`Backend says: ${(await res.json()).message}`);
      })
      .catch(err => alert("Server connection failed."));
    }
  };

  const handleFollow = (targetChefId, targetUsername) => {
    fetch(`https://recipebox-api-yz4h.onrender.com/api/users/${targetChefId}/follow`, { method: 'POST', headers: { 'Authorization': `Bearer ${token}` } })
    .then(res => res.json())
    .then(data => {
      alert(data.message); 
      fetchMyProfile(); // Refresh my own stats in sidebar
      if (viewMode === 'explore') fetchExploreRecipes();
      else if (viewMode === 'feed') fetchSocialFeed();
      else if (viewMode === 'chefProfile') fetchChefProfile(targetChefId); 
    })
    .catch(err => console.error(err));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const fullPayload = {
      title: formData.title,
      description: formData.description,
      prepTimeMinutes: Number(formData.prepTimeMinutes) || 0,
      imageUrl: formData.imageUrl || '',
      ingredients: ingredientsText.split('\n').map(item => item.trim()).filter(i => i).map(i => ({ name: i, quantity: '1', unit: 'item' })),
      instructions: instructionsText.split('\n').map(step => step.trim()).filter(s => s),
      tags: tags ? tags.split(',').map(tag => tag.trim()).filter(t => t) : []
    };

    fetch('https://recipebox-api-yz4h.onrender.com/api/recipes/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify(fullPayload),
    })
    .then(res => { if (!res.ok) throw new Error('Failed to create'); return res.json(); })
    .then(() => {
      fetchVaultRecipes(); 
      setFormData({ title: '', description: '', prepTimeMinutes: '', imageUrl: '' });
      setIngredientsText(''); setInstructionsText(''); setTags('');
    })
    .catch(err => alert("Submission error."));
  };

  const handleReviewSubmit = (e, recipeId) => {
    e.preventDefault();
    const review = reviewData[recipeId];
    if (!review || !review.comment) return;

    fetch(`https://recipebox-api-yz4h.onrender.com/api/recipes/${recipeId}/reviews`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
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
    setReviewData(prev => ({ ...prev, [recipeId]: { ...prev[recipeId], [field]: value } }));
  };

  if (!token) {
    return (
      <div className="auth-container">
        <form className="recipe-form" onSubmit={handleAuthSubmit}>
          <h2>{isRegistering ? "Create an Account" : "Welcome Back"}</h2>
          {isRegistering && <input name="username" placeholder="Username" value={authData.username} onChange={handleAuthChange} required />}
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
    <div className="App" style={{ backgroundColor: '#f0f4f8', minHeight: '100vh', paddingBottom: '50px' }}>
      
      {/* 🔝 HEADER SECTION */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '15px 30px', backgroundColor: '#ffffff', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', marginBottom: '30px' }}>
        <h2 style={{ margin: 0, color: '#00a86b', fontWeight: 'bold' }}>
          {viewMode === 'vault' && "🔒 My Private Vault"}
          {viewMode === 'feed' && "🌐 Social Feed"}
          {viewMode === 'explore' && "🔍 Global Recipes"}
          {viewMode === 'chefProfile' && "🧑‍🍳 Chef Profile"}
        </h2>
        
        <div style={{ display: 'flex', gap: '10px' }}>
           <button onClick={fetchVaultRecipes} style={{ padding: '8px 15px', backgroundColor: viewMode === 'vault' ? '#00a86b' : '#e2e8f0', color: viewMode === 'vault' ? 'white' : '#4a5568', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>My Vault</button>
           <button onClick={fetchSocialFeed} style={{ padding: '8px 15px', backgroundColor: viewMode === 'feed' ? '#00a86b' : '#e2e8f0', color: viewMode === 'feed' ? 'white' : '#4a5568', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>Social Feed</button>
           <button onClick={fetchExploreRecipes} style={{ padding: '8px 15px', backgroundColor: viewMode === 'explore' ? '#00a86b' : '#e2e8f0', color: viewMode === 'explore' ? 'white' : '#4a5568', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>Explore</button>
           <button onClick={handleLogout} style={{ padding: '8px 15px', backgroundColor: '#dc2626', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', marginLeft: '15px' }}>Log Out</button>
        </div>
      </div>

      {/* 🌟 LAYOUT WRAPPER: SIDEBAR + MAIN CONTENT */}
      <div style={{ display: 'flex', maxWidth: '1400px', margin: '0 auto', padding: '0 30px', gap: '30px', alignItems: 'flex-start' }}>
        
        {/* 👈 LEFT SIDEBAR (MY PROFILE) */}
        <div style={{ flex: '0 0 320px', backgroundColor: '#ffffff', padding: '25px', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)', position: 'sticky', top: '20px' }}>
          
          {isEditingProfile ? (
            // EDIT PROFILE FORM
            <form onSubmit={handleProfileUpdateSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              <h3 style={{ margin: '0 0 10px 0', color: '#2d3748' }}>Edit Profile</h3>
              <input 
                type="text" placeholder="Profile Image URL" 
                value={profileFormData.profilePicture} 
                onChange={(e) => setProfileFormData({...profileFormData, profilePicture: e.target.value})}
                style={{ padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
              />
              <textarea 
                placeholder="Write a short bio..." rows="4" 
                value={profileFormData.bio} 
                onChange={(e) => setProfileFormData({...profileFormData, bio: e.target.value})}
                style={{ padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', resize: 'vertical' }}
              />
              <div style={{ display: 'flex', gap: '10px' }}>
                <button type="submit" style={{ flex: 1, padding: '10px', backgroundColor: '#00a86b', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>Save</button>
                <button type="button" onClick={() => setIsEditingProfile(false)} style={{ flex: 1, padding: '10px', backgroundColor: '#e2e8f0', color: '#4a5568', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>Cancel</button>
              </div>
            </form>
          ) : (
            // STATIC PROFILE DISPLAY
            <div style={{ textAlign: 'center' }}>
              <img 
                src={myFullProfile?.profilePicture || "https://cdn-icons-png.flaticon.com/512/149/149071.png"} 
                alt="My Profile"
                style={{ width: '100px', height: '100px', borderRadius: '50%', objectFit: 'cover', border: '4px solid #00a86b', marginBottom: '15px' }}
                onError={(e) => { e.target.src = "https://cdn-icons-png.flaticon.com/512/149/149071.png"; }}
              />
              <h3 style={{ margin: '0 0 5px 0', color: '#1a202c', fontSize: '20px' }}>@{userProfile.username}</h3>
              <p style={{ margin: '0 0 20px 0', fontSize: '14px', color: '#718096', fontStyle: 'italic', lineHeight: '1.4' }}>
                {myFullProfile?.bio || "You haven't written a bio yet. Tell the world about your cooking!"}
              </p>
              
              <div style={{ display: 'flex', justifyContent: 'space-around', padding: '15px 0', borderTop: '1px solid #edf2f7', borderBottom: '1px solid #edf2f7', marginBottom: '20px' }}>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontSize: '18px', fontWeight: 'bold', color: '#2d3748' }}>{myFullProfile?.followers?.length || 0}</span>
                  <span style={{ fontSize: '12px', color: '#a0aec0', textTransform: 'uppercase' }}>Followers</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontSize: '18px', fontWeight: 'bold', color: '#2d3748' }}>{myFullProfile?.following?.length || 0}</span>
                  <span style={{ fontSize: '12px', color: '#a0aec0', textTransform: 'uppercase' }}>Following</span>
                </div>
              </div>

              <button 
                onClick={() => setIsEditingProfile(true)}
                style={{ width: '100%', padding: '10px', backgroundColor: '#e2e8f0', color: '#4a5568', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}
              >
                Edit Profile
              </button>
            </div>
          )}
        </div>

        {/* 👉 RIGHT SIDE: MAIN CONTENT AREA */}
        <div style={{ flex: '1', minWidth: '0' }}> 
          
          {/* SEARCH BAR (EXPLORE VIEW) */}
          {viewMode === 'explore' && (
            <div style={{ marginBottom: '20px' }}>
              <form onSubmit={handleSearch} style={{ display: 'flex', gap: '10px' }}>
                <input type="text" placeholder="Search for a recipe title or ingredient..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} style={{ flex: 1, padding: '12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '16px' }} />
                <button type="submit" style={{ padding: '12px 24px', backgroundColor: '#3182ce', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>Search</button>
                <button type="button" onClick={() => { setSearchQuery(''); fetchExploreRecipes(); }} style={{ padding: '12px 16px', backgroundColor: '#e2e8f0', color: '#4a5568', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>Clear</button>
              </form>
            </div>
          )}

          {/* HORIZONTAL PROFILES LIST (SOCIAL FEED) */}
          {viewMode === 'feed' && followedChefs.length > 0 && (
            <div style={{ marginBottom: '25px', backgroundColor: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
              <h3 style={{ color: '#2d3748', margin: '0 0 15px 0', fontSize: '16px' }}>Chefs You Follow</h3>
              <div style={{ display: 'flex', gap: '25px', overflowX: 'auto', paddingBottom: '10px' }}>
                {followedChefs.map(chef => (
                  <div key={chef._id} onClick={() => fetchChefProfile(chef._id)} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: '70px', cursor: 'pointer' }}>
                    <img src={chef.profilePicture || "https://cdn-icons-png.flaticon.com/512/149/149071.png"} alt={chef.username} style={{ width: '60px', height: '60px', borderRadius: '50%', objectFit: 'cover', border: '3px solid #00a86b' }} onError={(e) => { e.target.src = "https://cdn-icons-png.flaticon.com/512/149/149071.png"; }} />
                    <span style={{ fontSize: '12px', fontWeight: 'bold', marginTop: '8px', color: '#4a5568' }}>@{chef.username}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* DEDICATED CHEF PROFILE HEADER */}
          {viewMode === 'chefProfile' && selectedChefProfile && (
            <div style={{ marginBottom: '30px', padding: '30px', backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', textAlign: 'center', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
              <img src={selectedChefProfile.profilePicture || "https://cdn-icons-png.flaticon.com/512/149/149071.png"} alt={selectedChefProfile.username} style={{ width: '120px', height: '120px', borderRadius: '50%', objectFit: 'cover', border: '4px solid #00a86b', marginBottom: '15px' }} />
              <h2 style={{ margin: '0 0 10px 0', color: '#1a202c', fontSize: '28px' }}>@{selectedChefProfile.username}</h2>
              <p style={{ margin: '0 auto 20px auto', color: '#4a5568', fontStyle: 'italic', maxWidth: '600px', fontSize: '16px' }}>{selectedChefProfile.bio || "No bio yet!"}</p>
              <div style={{ display: 'flex', justifyContent: 'center', gap: '30px', marginBottom: '25px', fontSize: '18px' }}>
                <div><strong style={{ color: '#2d3748' }}>{selectedChefProfile.followers?.length || 0}</strong> Followers</div>
                <div><strong style={{ color: '#2d3748' }}>{selectedChefProfile.following?.length || 0}</strong> Following</div>
                <div><strong style={{ color: '#2d3748' }}>{recipes.length}</strong> Recipes</div>
              </div>
              {selectedChefProfile._id !== userProfile.id && (
                <button onClick={() => handleFollow(selectedChefProfile._id, selectedChefProfile.username)} style={{ padding: '12px 30px', backgroundColor: selectedChefProfile.followers?.includes(userProfile.id) ? '#e2e8f0' : '#3182ce', color: selectedChefProfile.followers?.includes(userProfile.id) ? '#4a5568' : 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '16px' }}>
                  {selectedChefProfile.followers?.includes(userProfile.id) ? 'Following' : 'Follow Chef'}
                </button>
              )}
            </div>
          )}

          {/* CREATE RECIPE FORM (VAULT) */}
          {viewMode === 'vault' && (
            <div style={{ backgroundColor: '#ffffff', padding: '20px', borderRadius: '12px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', marginBottom: '30px' }}>
              <form className="recipe-form comprehensive-form" onSubmit={handleSubmit}>
                <h3 style={{marginTop: 0}}>Add New Comprehensive Recipe</h3>
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
            </div>
          )}

          {/* RECIPE LIST GRID */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
            {recipes.length === 0 ? (
              <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '40px', color: '#718096' }}>
                {viewMode === 'vault' && "Your vault is empty. Add a recipe above!"}
                {viewMode === 'feed' && "Your feed is empty. Follow some chefs in the Explore tab!"}
                {viewMode === 'explore' && "There are no other recipes on the platform right now!"}
                {viewMode === 'chefProfile' && "This chef hasn't posted any recipes yet!"}
              </div>
            ) : null}
            
            {recipes.map(recipe => {
              const authorId = typeof recipe.author === 'object' ? recipe.author._id : recipe.author;
              const isOwner = authorId === userProfile.id;

              return (
                <div key={recipe._id} className="recipe-card" style={{ margin: 0 }}>
                  <div className="recipe-image-container">
                    <img src={recipe.imageUrl || "https://images.pexels.com/photos/1640777/pexels-photo-1640777.jpeg?auto=compress&cs=tinysrgb&w=600"} alt={recipe.title} className="recipe-image" onError={(e) => { e.target.src = "https://images.pexels.com/photos/1640777/pexels-photo-1640777.jpeg?auto=compress&cs=tinysrgb&w=600"; }} />
                  </div>
                  <div className="recipe-content">
                    <h2>{recipe.title}</h2>
                    <div className="recipe-info">
                      <p><strong>Prep time:</strong> {recipe.prepTimeMinutes} mins</p>
                      <p className="description">{recipe.description}</p>
                      {recipe.ingredients && recipe.ingredients.length > 0 && (
                        <div className="rendered-data-block">
                          <h5>Ingredients:</h5>
                          <ul className="mini-render-list">{recipe.ingredients.map((ing, i) => <li key={i}>{ing.name}</li>)}</ul>
                        </div>
                      )}
                    </div>
                    
                    <div className="card-footer" style={{ marginTop: '15px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span className="chef-name" onClick={() => fetchChefProfile(authorId)} style={{ fontWeight: 'bold', color: '#3182ce', cursor: 'pointer', textDecoration: 'underline', fontSize: '14px' }}>
                        @{recipe.author?.username || 'Unknown'}
                      </span>
                      <div style={{ display: 'flex', gap: '10px' }}>
                        {isOwner ? (
                          <button className="delete-btn" onClick={() => handleDelete(recipe._id)}>Delete</button>
                        ) : (
                          <button onClick={() => handleFollow(authorId, recipe.author?.username)} style={{ padding: '6px 10px', backgroundColor: '#3182ce', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', fontSize: '12px' }}>
                            {viewMode === 'feed' ? 'Unfollow' : 'Follow'}
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
      </div>
    </div>
  );
}

export default App;
