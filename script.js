const fs = require('fs'); 
const content = fs.readFileSync('Frontend/src/ResidentProfile.jsx', 'utf8'); 
const newContent = content.replace(/\{\/\* TAB: Edit Profile \*\/\}[\s\S]*?\{\/\* TAB: My Community Posts \(Full Search, Filters, Edit, Delete, Create\) \*\/\}/, `          {/* TAB: Edit Profile */}
          {activeTab === 'edit' && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <h2 className="text-[28px] font-semibold text-black m-0 mb-8 leading-tight">Edit Profile</h2>
              <form onSubmit={handleUpdateProfile} className="flex flex-col">
                <div className="flex flex-col gap-5">
                  
                  {/* Profile Photo Upload */}
                  <div className="flex flex-col gap-2">
                    <label className="text-[14px] font-medium text-gray-900">Profile Photo</label>
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-16 rounded-full overflow-hidden bg-gray-100 flex items-center justify-center shrink-0 border border-[#E5E5EA]">
                        {profile.profileImage ? (
                          <img src={profile.profileImage} alt="Profile" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        ) : (
                          <span className="text-2xl text-gray-400 font-bold">
                            {profile.name ? profile.name.charAt(0).toUpperCase() : 'U'}
                          </span>
                        )}
                      </div>
                      <label className="h-10 px-4 bg-white border border-[#D9D9DE] text-[14px] font-medium text-gray-700 rounded-xl hover:bg-gray-50 transition-colors cursor-pointer flex items-center justify-center shadow-sm">
                        Upload New Photo
                        <input 
                          type="file" 
                          accept="image/*" 
                          className="hidden"
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            
                            const formData = new FormData();
                            formData.append('file', file);
                            
                            try {
                              const res = await axios.post(\`\${API_BASE_URL}/upload/image\`, formData, {
                                headers: { 'Content-Type': 'multipart/form-data' }
                              });
                              setProfile({ ...profile, profileImage: res.data.url });
                            } catch (err) {
                              console.error('Image upload failed', err);
                              alert('Failed to upload image.');
                            }
                          }}
                        />
                      </label>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2">
                    <label className="text-[14px] font-medium text-gray-900">Display Name</label>
                    <input
                      type="text"
                      value={profile.name || ''}
                      onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                      className="w-full h-12 px-4 bg-white border border-[#D9D9DE] rounded-xl text-[16px] text-black focus:ring-2 focus:ring-black focus:outline-none hover:bg-gray-50 transition-colors"
                    />
                  </div>

                  <div className="flex flex-col gap-2">
                    <label className="text-[14px] font-medium text-gray-900">Phone Number (10 digits)</label>
                    <input
                      type="tel"
                      maxLength={10}
                      value={profile.phoneNo || ''}
                      onChange={(e) => {
                        const clean = e.target.value.replace(/\\D/g, '').slice(0, 10);
                        setProfile({ ...profile, phoneNo: clean });
                      }}
                      className={\`w-full h-12 px-4 bg-white border \${profile.phoneNo && !/^0\\d{9}$/.test(profile.phoneNo) ? 'border-red-500 focus:ring-red-500' : 'border-[#D9D9DE] focus:ring-black'} rounded-xl text-[16px] text-black focus:ring-2 focus:outline-none hover:bg-gray-50 transition-colors\`}
                    />
                    {profile.phoneNo && !/^0\d{9}$/.test(profile.phoneNo) && (
                      <span className="text-[13px] text-red-500 mt-1">Must be 10 digits starting with 0</span>
                    )}
                  </div>

                  <div className="flex flex-col gap-2">
                    <label className="text-[14px] font-medium text-gray-900">Physical Address</label>
                    <input
                      type="text"
                      value={profile.address || ''}
                      onChange={(e) => setProfile({ ...profile, address: e.target.value })}
                      className="w-full h-12 px-4 bg-white border border-[#D9D9DE] rounded-xl text-[16px] text-black focus:ring-2 focus:ring-black focus:outline-none hover:bg-gray-50 transition-colors"
                    />
                  </div>
                </div>

                <div className="mt-8">
                  <button type="submit" className="w-full sm:w-auto h-12 px-6 font-semibold text-white bg-black rounded-xl hover:bg-[#222222] transition-colors border-none outline-none cursor-pointer text-[16px] whitespace-nowrap">
                    Save Changes
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* TAB: My Community Posts (Full Search, Filters, Edit, Delete, Create) */}`); 
fs.writeFileSync('Frontend/src/ResidentProfile.jsx', newContent);
