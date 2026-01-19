import { useEffect, useState, useContext } from 'react';
import { AppContext } from '../../context/AppContext';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-toastify';
import Confetti from 'react-confetti';
import { useWindowSize } from 'react-use';

const QuizPage = () => {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const { backendUrl, getToken } = useContext(AppContext);

  const [quiz, setQuiz] = useState([]);
  const [answers, setAnswers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showPassPopup, setShowPassPopup] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [hasPassed, setHasPassed] = useState(false);

  const { width, height } = useWindowSize();

  // Fetch quiz data
  const fetchCourseData = async () => {
    try {
      const token = await getToken();
      const { data } = await axios.get(`${backendUrl}/api/course/${courseId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!data.success || !data.courseData) {
        toast.error('Course not found');
        navigate('/my-enrollments');
        return;
      }

      const course = data.courseData;

      if (!course.quiz || course.quiz.length === 0) {
        toast.error('No quiz available for this course');
        navigate('/my-enrollments');
        return;
      }

      setQuiz(course.quiz);
      setAnswers(new Array(course.quiz.length).fill(''));

      // Check if user already completed/passed
      if (course.userQuizStatus) {
        setIsCompleted(course.userQuizStatus.completed);
        setHasPassed(course.userQuizStatus.passed);
      }
    } catch (err) {
      toast.error(err.message);
      navigate('/my-enrollments');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCourseData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseId]);

  // Submit quiz
  const submitQuiz = async () => {
  if (isCompleted) return; // prevent re-attempt

  try {
    const token = await getToken();
    const { data } = await axios.post(
      `${backendUrl}/api/user/submit-quiz`,
      { courseId, answers },
      { headers: { Authorization: `Bearer ${token}` } }
    );

    setIsCompleted(true); // disable submit button
    setHasPassed(data.passed);

    if (data.passed) {
      setShowPassPopup(true);
      setShowConfetti(true);

      setTimeout(() => {
        setShowConfetti(false);
        navigate(`/certificate/${courseId}`);
      }, 5000);
    } else {
      toast.error('❌ You did not pass. Redirecting to My Enrollments', { autoClose: 2500 });
      setTimeout(() => {
        navigate('/my-enrollments');
      }, 2500);
    }
  } catch (err) {
    toast.error(err.message);
  }
};


  if (loading)
    return <p className="p-8 text-center text-gray-500 text-lg">Loading quiz...</p>;

  return (
    <div className="p-6 md:p-8 max-w-3xl mx-auto relative">
      <h1 className="text-3xl md:text-4xl font-extrabold mb-8 text-center text-gray-800">
        Final Quiz
      </h1>

      {quiz.map((q, i) => (
        <div
          key={i}
          className="mb-6 p-6 border rounded-xl shadow-md bg-white hover:shadow-lg transition-shadow duration-200"
        >
          <p className="font-semibold text-gray-700 mb-4 text-lg md:text-xl">
            {i + 1}. {q.question}
          </p>
          <div className="flex flex-col space-y-2">
            {q.options.map((opt, idx) => (
              <label
                key={idx}
                className={`flex items-center cursor-pointer p-3 rounded-lg border transition-colors duration-150
                  ${
                    answers[i] === opt
                      ? 'bg-blue-100 border-blue-400'
                      : 'hover:bg-gray-100 border-gray-200'
                  }
                  ${isCompleted ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <input
                  type="radio"
                  name={`question-${i}`}
                  value={opt}
                  checked={answers[i] === opt}
                  onChange={() => {
                    if (!isCompleted) {
                      const copy = [...answers];
                      copy[i] = opt;
                      setAnswers(copy);
                    }
                  }}
                  className="mr-3 accent-blue-600 w-5 h-5"
                  disabled={isCompleted}
                />
                <span className="text-gray-800 text-md md:text-lg">{opt}</span>
              </label>
            ))}
          </div>
        </div>
      ))}

      <button
        onClick={submitQuiz}
        disabled={isCompleted}
        className={`w-full font-semibold py-3 md:py-4 rounded-xl shadow-lg text-lg md:text-xl
          ${isCompleted
            ? 'bg-gray-400 cursor-not-allowed'
            : 'bg-blue-600 text-white hover:bg-blue-700 transition-colors duration-200'}`}
      >
        Submit Quiz
      </button>

      {/* Pass popup */}
      {showPassPopup && (
        <>
          {showConfetti && <Confetti width={width} height={height} numberOfPieces={400} />}
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-2xl p-8 flex flex-col items-center shadow-lg animate-fadeIn">
              <h2 className="text-3xl font-bold text-green-600 mb-4">🎉 You Passed!</h2>
              <p className="text-gray-700 text-center mb-4">
                Congratulations on completing the quiz!
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default QuizPage;
