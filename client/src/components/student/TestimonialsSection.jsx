import { useEffect, useState, useContext } from 'react';
import { assets } from '../../assets/assets';
import axios from 'axios';
import { AppContext } from '../../context/AppContext';

const TestimonialsSection = () => {
  const { backendUrl } = useContext(AppContext);
  const [testimonials, setTestimonials] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTestimonials = async () => {
      try {
        const { data } = await axios.get(
          `${backendUrl}/api/course/get-feedback`
        );

        if (Array.isArray(data)) {
          setTestimonials(
            data.sort(
              (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
            )
          );
        } else {
          setTestimonials([]);
        }
      } catch (err) {
        console.error('Error fetching testimonials:', err);
        setTestimonials([]);
      } finally {
        setLoading(false);
      }
    };

    fetchTestimonials();
  }, [backendUrl]); // runs every time Home mounts

  return (
    <div className="pb-14 px-8 md:px-0">
      <h2 className="text-3xl font-medium text-gray-800">Testimonials</h2>
      <p className="md:text-base text-gray-500 mt-3">
        Hear from our learners as they share their journeys of transformation,
        success, and how our platform has made a difference in their lives.
      </p>

      {loading ? (
        <p className="text-center text-gray-500 mt-6">
          Loading testimonials...
        </p>
      ) : testimonials.length === 0 ? (
        <p className="text-center text-gray-500 mt-6">
          No testimonials yet. Be the first to leave feedback!
        </p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mt-14">
          {testimonials.map((testimonial) => (
            <div
              key={testimonial._id}
              className="text-sm text-left border border-gray-500/30 pb-6 rounded-lg bg-white shadow-[0px_4px_15px_0px] shadow-black/5 overflow-hidden"
            >
              <div className="flex items-center gap-4 px-5 py-4 bg-gray-500/10">
                <img
                  className="h-12 w-12 rounded-full"
                  src={testimonial.profileImage || assets.defaultAvatar}
                  alt={testimonial.name || 'User'}
                />
                <div>
                  <h1 className="text-lg font-medium text-gray-800">
                    {testimonial.name || 'Anonymous'}
                  </h1>
                  <p className="text-gray-800/80">
                    {testimonial.email || ''}
                  </p>
                </div>
              </div>

              <div className="p-5 pb-7">
                <div className="flex gap-1 mb-3">
                  {[...Array(5)].map((_, i) => (
                    <img
                      key={i}
                      className="h-5"
                      src={
                        i < (testimonial.rating || 5)
                          ? assets.star
                          : assets.star_blank
                      }
                      alt="star"
                    />
                  ))}
                </div>

                <p className="text-gray-500">
                  {testimonial.message}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default TestimonialsSection;
