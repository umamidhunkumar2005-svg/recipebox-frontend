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
  const [selectedChefProfile, setSelectedChefProfile] = useState(null); 

  // 🌟 NEW: State for the logged-in user's full database profile
  const [myFullProfile, setMyFullProfile] = useState(null);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profileFormData, setProfileFormData] = useState({ bio: '', profilePicture: '' });

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

  // 🌟 NEW: Fetch my full profile to show in the Sidebar
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

  // 🔒 FETCH PRIVATE VAULT
  const fetchVaultRecipes = () => {
    fetch('https://recipebox-api-yz4h.onrender.com/api/recipes', { headers: { 'Authorization': `Bearer ${token}` }})
      .then(res => res.json())
      .then(data => { setRecipes(data); setViewMode('vault'); })
      .catch(err => console.error(err));
  };

  // 🌐 FETCH SOCIAL FEED
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

  // 🔍 FETCH EXPLORE FEED
  const fetchExploreRecipes = () => {
    fetch('https://recipebox-api-yz4h.onrender.com/api/recipes/explore', { headers: { 'Authorization': `Bearer ${token}` }})
      .then(res => res.json())
      .then(data => { setRecipes(data); setViewMode('explore'); })
      .catch(err => console.error(err));
  };

  // 🌟 NEW: FETCH SINGLE CHEF PROFILE
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

  // 🔎 SEARCH RECIPES
  const handleSearch = (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return; 
    fetch(`https://recipebox-api-yz4h.onrender.com/api/recipes/search?query=${searchQuery}`, { headers: { 'Authorization': `Bearer ${token}` }})
    .then(res => res.json())
    .then(data => { setRecipes(data); setViewMode('explore'); })
    .catch(err => console.error(err));
  };

  // 🌟 NEW: Submit profile updates
  const handleProfileUpdateSubmit = (e) => {
    e.preventDefault();
    fetch('https://recipebox-api-yz4h.onrender.com/api/users/update-profile', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify(profileFormData)
    })
    .then(res => res.json())
    .then(updatedData => { setMyFullProfile(updatedData); setIsEditingProfile(false); })
    .catch(err => alert("Failed to update profile"));
  };

  useEffect(() => { if (token) { fetchVaultRecipes(); fetchMyProfile(); } }, [token]);

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

  const handleLogout = () => { sessionStorage.removeItem('token'); window.location.reload(); };

  const handleDelete = (id) => {
    if (window.confirm("Are you sure you want to delete this recipe?")) {
      fetch(`https://recipebox-api-yz4h.onrender.com/api/recipes/${id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } })
      .then(async res => { if (res.ok) fetchVaultRecipes(); else alert(`Backend says: ${(await res.json()).message}`); })
      .catch(err => alert("Server connection failed."));
    }
  };

  const handleFollow = (targetChefId) => {
    fetch(`https://recipebox-api-yz4h.onrender.com/api/users/${targetChefId}/follow`, { method: 'POST', headers: { 'Authorization': `Bearer ${token}` } })
    .then(res => res.json())
    .then(data => {
      alert(data.message); 
      fetchMyProfile();
      if (viewMode === 'explore') fetchExploreRecipes();
      else if (viewMode === 'feed') fetchSocialFeed();
      else if (viewMode === 'chefProfile') fetchChefProfile(targetChefId); 
      else fetchVaultRecipes();
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

  const handleReviewChange = (recipeId, field, value) => { setReviewData(prev => ({ ...prev, [recipeId]: { ...prev[recipeId], [field]: value } })); };

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
      {/* 🔝 HEADER */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '15px 30px', backgroundColor: '#ffffff', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', marginBottom: '30px' }}>
        <h2 style={{ margin: 0, color: '#00a86b', fontWeight: 'bold' }}>RecipeBox</h2>
        <div style={{ display: 'flex', gap: '10px' }}>
           <button onClick={fetchVaultRecipes} style={{ padding: '8px 15px', backgroundColor: viewMode === 'vault' ? '#00a86b' : '#e2e8f0', color: viewMode === 'vault' ? 'white' : '#4a5568', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>My Vault</button>
           <button onClick={fetchSocialFeed} style={{ padding: '8px 15px', backgroundColor: viewMode === 'feed' ? '#00a86b' : '#e2e8f0', color: viewMode === 'feed' ? 'white' : '#4a5568', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>Social Feed</button>
           <button onClick={fetchExploreRecipes} style={{ padding: '8px 15px', backgroundColor: viewMode === 'explore' ? '#00a86b' : '#e2e8f0', color: viewMode === 'explore' ? 'white' : '#4a5568', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>Explore</button>
           <button onClick={handleLogout} style={{ padding: '8px 15px', backgroundColor: '#dc2626', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>Log Out</button>
        </div>
      </div>

      <div style={{ display: 'flex', maxWidth: '1400px', margin: '0 auto', padding: '0 30px', gap: '30px', alignItems: 'flex-start' }}>
        {/* 👈 LEFT SIDEBAR (MY PROFILE) */}
        <div style={{ flex: '0 0 320px', backgroundColor: '#ffffff', padding: '25px', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)', position: 'sticky', top: '20px' }}>
          {isEditingProfile ? (
            <form onSubmit={handleProfileUpdateSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              <h3 style={{ margin: 0 }}>Edit Profile</h3>
              <input type="text" placeholder="Profile Image URL" value={profileFormData.profilePicture} onChange={(e) => setProfileFormData({...profileFormData, profilePicture: e.target.value})} style={{ padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1' }} />
              <textarea placeholder="Write a bio..." rows="4" value={profileFormData.bio} onChange={(e) => setProfileFormData({...profileFormData, bio: e.target.value})} style={{ padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1' }} />
              <div style={{ display: 'flex', gap: '10px' }}><button type="submit" style={{ flex: 1, padding: '10px', backgroundColor: '#00a86b', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>Save</button><button type="button" onClick={() => setIsEditingProfile(false)} style={{ flex: 1, padding: '10px', backgroundColor: '#e2e8f0', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>Cancel</button></div>
            </form>
          ) : (
            <div style={{ textAlign: 'center' }}>
              <img src={myFullProfile?.profilePicture || "https://cdn-icons-png.flaticon.com/512/149/149071.png"} style={{ width: '100px', height: '100px', borderRadius: '50%', border: '4px solid #00a86b' }} />
              <h3>@{userProfile.username}</h3>
              <p>{myFullProfile?.bio || "No bio yet!"}</p>
              <button onClick={() => setIsEditingProfile(true)} style={{ width: '100%', padding: '10px', backgroundColor: '#e2e8f0', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>Edit Profile</button>
            </div>
          )}
        </div>

        {/* 👉 RIGHT SIDE: MAIN CONTENT */}
        <div style={{ flex: '1' }}>
          {viewMode === 'explore' && (
            <form onSubmit={handleSearch} style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
              <input type="text" placeholder="Search..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} style={{ flex: 1, padding: '12px', borderRadius: '6px', border: '1px solid #cbd5e1' }} />
              <button type="submit" style={{ padding: '10px 20px', backgroundColor: '#3182ce', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>Search</button>
              <button type="button" onClick={() => { setSearchQuery(''); fetchExploreRecipes(); }} style={{ padding: '12px 16px', backgroundColor: '#e2e8f0', color: '#4a5568', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>Clear</button>
            </form>
          )}

          {viewMode === 'chefProfile' && selectedChefProfile && (
            <div style={{ padding: '30px', backgroundColor: 'white', borderRadius: '12px', marginBottom: '30px', textAlign: 'center' }}>
              <img src={selectedChefProfile.profilePicture || "https://cdn-icons-png.flaticon.com/512/149/149071.png"} style={{ width: '100px', height: '100px', borderRadius: '50%' }} />
              <h2>@{selectedChefProfile.username}</h2>
              <p>{selectedChefProfile.bio}</p>
              <button onClick={() => handleFollow(selectedChefProfile._id)} style={{ padding: '10px 20px', backgroundColor: '#3182ce', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>
                {selectedChefProfile.followers?.includes(userProfile.id) ? 'Following' : 'Follow'}
              </button>
            </div>
          )}

          {viewMode === 'vault' && (
            <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '12px', marginBottom: '20px' }}>
              <form onSubmit={handleSubmit}>
                <h3>Add Recipe</h3>
                <input name="title" placeholder="Title" value={formData.title} onChange={handleChange} required style={{ width: '100%', padding: '10px', marginBottom: '10px' }} />
                <input name="prepTimeMinutes" type="number" placeholder="Prep Time" value={formData.prepTimeMinutes} onChange={handleChange} required style={{ width: '100%', padding: '10px', marginBottom: '10px' }} />
                <textarea name="description" placeholder="Description" value={formData.description} onChange={handleChange} required style={{ width: '100%', padding: '10px', marginBottom: '10px' }} />
                <button type="submit" style={{ width: '100%', padding: '10px', backgroundColor: '#00a86b', color: 'white', border: 'none', borderRadius: '6px' }}>Post</button>
              </form>
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
            {recipes.map(recipe => (
              <div key={recipe._id} className="recipe-card" style={{ padding: '15px', backgroundColor: 'white', borderRadius: '12px' }}>
                <h3>{recipe.title}</h3>
                <p>{recipe.description}</p>
                
                {/* --- RESTORED RATINGS & COMMENTS SECTION --- */}
                <div style={{ borderTop: '1px solid #eee', marginTop: '10px', paddingTop: '10px' }}>
                   <h5>Comments ({recipe.reviews?.length || 0})</h5>
                   <form onSubmit={(e) => handleReviewSubmit(e, recipe._id)} style={{ display: 'flex', gap: '5px' }}>
                      <select value={reviewData[recipe._id]?.rating || 5} onChange={(e) => handleReviewChange(recipe._id, 'rating', e.target.value)}><option>5</option><option>4</option><option>3</option></select>
                      <input placeholder="Add comment..." value={reviewData[recipe._id]?.comment || ''} onChange={(e) => handleReviewChange(recipe._id, 'comment', e.target.value)} />
                      <button type="submit">Post</button>
                   </form>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '10px' }}>
                  <span onClick={() => fetchChefProfile(recipe.author?._id || recipe.author)} style={{ color: '#3182ce', cursor: 'pointer', textDecoration: 'underline' }}>@{recipe.author?.username || 'Unknown'}</span>
                  <button onClick={() => handleFollow(recipe.author?._id || recipe.author)} style={{ padding: '5px 10px' }}>Follow</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
