import React, { useContext, useEffect } from 'react';
import { assets } from '../../assets/assets';
import { Link, useLocation } from 'react-router-dom';
import { AppContext } from '../../context/AppContext';
import { UserButton, useUser, useClerk } from '@clerk/clerk-react';
import { toast } from 'react-toastify';
import axios from 'axios';

const Navbar = () => {
  const location = useLocation();
  const isCoursesListPage = location.pathname.includes('/course-list');

  const { backendUrl, isEducator, setIsEducator, navigate, getToken } = useContext(AppContext);
  const { user } = useUser();
  const { openSignIn } = useClerk();

  // Initialize local state based on Clerk role
  useEffect(() => {
    if (user?.publicMetadata?.role === 'educator') {
      setIsEducator(true);
    } else {
      setIsEducator(false);
    }
  }, [user]);

  // Promote to educator on single click
  const handlePromote = async () => {
    if (isEducator) {
      navigate('/educator/dashboard'); // already educator → go to dashboard
      return;
    }
    try {
      const token = await getToken();
      const { data } = await axios.post(
        `${backendUrl}/api/educator/update-role`, // promote endpoint
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (data.success) {
        setIsEducator(true);
        toast.success(data.message);
        navigate('/educator/dashboard');
      } else {
        toast.error(data.message);
      }
    } catch (err) {
      toast.error(err.message);
    }
  };

  // Demote to student on double click
  const handleDemote = async () => {
    if (!isEducator) return;
    try {
      const token = await getToken();
      const { data } = await axios.post(
        `${backendUrl}/api/educator/demote-role`, // demote endpoint
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (data.success) {
        setIsEducator(false);
        toast.success('You are now a student.');
        navigate('/'); // optional: redirect home
      } else {
        toast.error(data.message);
      }
    } catch (err) {
      toast.error(err.message);
    }
  };

  return (
    <div className={`flex items-center justify-between px-4 sm:px-10 md:px-14 lg:px-36 border-b border-gray-500 py-4 ${isCoursesListPage ? 'bg-white' : 'bg-cyan-100/70'}`}>
      <img onClick={() => navigate('/')} src={assets.logo} alt="Logo" className="w-28 lg:w-32 cursor-pointer" />

      <div className="md:flex hidden items-center gap-5 text-gray-500">
        <div className="flex items-center gap-5">
          {user && (
            <>
              <button
                onClick={handlePromote}
                onDoubleClick={handleDemote}
              >
                {isEducator ? 'Educator Dashboard' : 'Become Educator'}
              </button>
              | <Link to='/my-enrollments'>My Enrollments</Link>
            </>
          )}
        </div>
        {user ? (
          <UserButton />
        ) : (
          <button onClick={() => openSignIn()} className="bg-blue-600 text-white px-5 py-2 rounded-full">
            Create Account
          </button>
        )}
      </div>

      {/* Mobile Navbar */}
      <div className='md:hidden flex items-center gap-2 sm:gap-5 text-gray-500'>
        <div className="flex items-center gap-1 sm:gap-2 max-sm:text-xs">
          <button
            onClick={handlePromote}
            onDoubleClick={handleDemote}
          >
            {isEducator ? 'Educator Dashboard' : 'Become Educator'}
          </button>
          | {user && <Link to='/my-enrollments'>My Enrollments</Link>}
        </div>
        {user ? (
          <UserButton />
        ) : (
          <button onClick={() => openSignIn()}>
            <img src={assets.user_icon} alt="" />
          </button>
        )}
      </div>
    </div>
  );
};

export default Navbar;
