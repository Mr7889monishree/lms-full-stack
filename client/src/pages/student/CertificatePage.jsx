import { useEffect, useState, useContext } from 'react';
import { AppContext } from '../../context/AppContext';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-toastify';

const CertificatePage = () => {
  const { courseId } = useParams();
  const { backendUrl, userData, getToken } = useContext(AppContext);
  const [certificateUrl, setCertificateUrl] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate=useNavigate();

  // Feedback modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [feedback, setFeedback] = useState({
    name: '',
    email: '',
    message: '',
    rating: 5
  });
  const [feedbackStatus, setFeedbackStatus] = useState('');

  useEffect(() => {
    if (!userData) return;

    let interval;

    const fetchCertificate = async () => {
      try {
        const token = await getToken();
        const { data } = await axios.post(
          `${backendUrl}/api/course/get-certificate`,
          { userId: userData._id, courseId },
          { headers: { Authorization: `Bearer ${token}` } }
        );

        if (data.download_url) {
          setCertificateUrl(data.download_url);
          setLoading(false);
        }
      } catch (err) {
        toast.error(err.message);
        setLoading(false);
      }
    };

    interval = setInterval(fetchCertificate, 5000);
    fetchCertificate();

    return () => clearInterval(interval);
  }, [courseId, backendUrl, userData, getToken]);

  const handleFeedbackChange = e => {
    setFeedback({ ...feedback, [e.target.name]: e.target.value });
  };

  const submitFeedback = async e => {
    e.preventDefault();

    if (!feedback.message) {
      setFeedbackStatus('Message is required');
      return;
    }

    try {
      await axios.post(`${backendUrl}/api/course/feedback`, {
        ...feedback,
      profileImage:userData.imageUrl});

      setFeedbackStatus('Feedback submitted successfully!');
      setFeedback({ name: '', email: '', message: '', rating: 5 });
      setIsModalOpen(false);

      window.dispatchEvent(new Event('feedbackUpdated'));

      navigate('/');
    } catch (err) {
      console.error(err);
      setFeedbackStatus('Error submitting feedback.');
    }
  };

  if (!userData) {
    return <p className="p-8 text-center text-gray-500">Loading user info...</p>;
  }

  return (
    <div className="p-6 max-w-3xl mx-auto relative">
      <h1 className="text-3xl font-bold mb-6 text-center">🎓 Your Certificate</h1>

      {loading ? (
        <p className="text-center text-gray-500">Generating your certificate...</p>
      ) : certificateUrl ? (
        <a
          href={certificateUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="block bg-green-600 text-white font-semibold py-4 rounded-lg text-center hover:bg-green-700 transition-colors"
        >
          Download Certificate
        </a>
      ) : (
        <p className="text-center text-gray-500">
          Certificate is being generated. Please wait a few seconds.
        </p>
      )}

      {/* Feedback Button */}
      <button
        className="fixed bottom-6 right-6 bg-blue-600 text-white px-5 py-3 rounded-full shadow-lg hover:bg-blue-700 transition-colors z-50"
        onClick={() => setIsModalOpen(true)}
      >
        Give Feedback
      </button>

      {/* Feedback Modal */}
      {isModalOpen && (
        <div
          className="fixed inset-0 bg-black/50 flex justify-center items-center z-50"
          onClick={() => setIsModalOpen(false)}
        >
          <div
            className="bg-white p-6 rounded-lg w-96"
            onClick={e => e.stopPropagation()}
          >
            <h2 className="text-xl font-semibold mb-4">Submit Feedback</h2>

            <form onSubmit={submitFeedback} className="flex flex-col gap-3"
            >

              <input
                type="text"
                name="name"
                placeholder="Name"
                value={feedback.name}
                onChange={handleFeedbackChange}
                className="border p-2 rounded"
                required
              />

              <input
                type="email"
                name="email"
                placeholder="Email (optional)"
                value={feedback.email}
                onChange={handleFeedbackChange}
                className="border p-2 rounded"
              />

              <textarea
                name="message"
                placeholder="Your feedback"
                value={feedback.message}
                onChange={handleFeedbackChange}
                className="border p-2 rounded h-24"
                required
              />

              {/* ⭐ Rating */}
              <label className="font-medium">Rating</label>
              <select
                name="rating"
                value={feedback.rating}
                onChange={handleFeedbackChange}
                className="border p-2 rounded"
              >
                <option value="5">⭐⭐⭐⭐⭐ Excellent</option>
                <option value="4">⭐⭐⭐⭐ Very Good</option>
                <option value="3">⭐⭐⭐ Good</option>
                <option value="2">⭐⭐ Fair</option>
                <option value="1">⭐ Poor</option>
              </select>

              <button
                type="submit"
                className="bg-green-600 text-white py-2 rounded hover:bg-green-700 transition-colors"
              >
                Submit
              </button>

              {feedbackStatus && <p className="text-sm mt-2">{feedbackStatus}</p>}
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CertificatePage;
