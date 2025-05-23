import { useQuizSetup, UserAnswer } from '@/context/quiz-setup-context';
import { Doc } from '@/convex/_generated/dataModel';
import { useBlockNavigation } from '@/hooks/use-block-navigation';
import { switchCategoryToLabel } from '@/utils/switch-category-to-label';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  Alert,
  Dimensions,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { ArrowLeft, ArrowRight, Check, Home, Star } from 'react-native-feather';
import Animated, {
  Easing,
  FadeIn,
  SlideInLeft,
  SlideInRight,
  SlideOutLeft,
  SlideOutRight,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');

export default function Questions() {
  const { setup, setUserAnswers, resetQuizData } = useQuizSetup();
  const { questions, quizType, questionFormat, userAnswers } = setup;
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState<number>(0);
  const [selectedOption, setSelectedOption] = useState<string>();
  const [textAnswer, setTextAnswer] = useState<string>('');
  const [showFeedback, setShowFeedback] = useState<boolean>(false);
  const [isCorrect, setIsCorrect] = useState<boolean>(false);
  const [slideDirection, setSlideDirection] = useState<'right' | 'left'>(
    'right'
  );
  const router = useRouter();

  // 애니메이션을 위한 값
  const scale = useSharedValue(1);
  const progressWidth = useSharedValue(0);

  const progressAnimatedStyles = useAnimatedStyle(() => {
    return {
      width: `${progressWidth.value}%`,
    };
  });

  useEffect(() => {
    // 사용자 답변 배열 초기화
    const initialAnswers: UserAnswer[] = questions.map(
      ({ _id, question, answer, answers }) => ({
        questionId: _id,
        question,
        correctAnswer: answer || answers,
        userAnswer: '',
        isCorrect: false,
      })
    );

    setUserAnswers(initialAnswers);
  }, []);

  useEffect(() => {
    // 진행률 업데이트 시 애니메이션
    const progress = ((currentQuestionIndex + 1) / questions.length) * 100;
    progressWidth.value = withTiming(progress, {
      duration: 600,
      easing: Easing.bezier(0.25, 0.1, 0.25, 1),
    });
  }, [currentQuestionIndex, questions.length]);

  const currentQuestion: Doc<'quizzes'> = questions[currentQuestionIndex];

  const handleAnswer = (): void => {
    let userAnswer: string = '';
    let correct: boolean = false;

    if (questionFormat === 'multiple') {
      userAnswer = selectedOption || '';
      correct = selectedOption === currentQuestion?.answer;
    } else {
      userAnswer = textAnswer.trim();
      correct = currentQuestion
        ?.answers!.map((a) => a.toLowerCase())
        .includes(userAnswer.toLowerCase());
    }

    // 애니메이션 효과
    scale.value = withTiming(
      1.05,
      { duration: 200, easing: Easing.bounce },
      () => {
        scale.value = withTiming(1, { duration: 200 });
      }
    );

    // 사용자 답변 업데이트
    const newUserAnswers = [...userAnswers];
    newUserAnswers[currentQuestionIndex] = {
      questionId: currentQuestion._id,
      question: currentQuestion.question,
      correctAnswer: currentQuestion.answer,
      userAnswer,
      isCorrect: correct,
    };

    setUserAnswers(newUserAnswers);
    setIsCorrect(correct);
    setShowFeedback(true);
  };

  const goToPreviousQuestion = (): void => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
      setShowFeedback(false);
      setSlideDirection('left');

      // 이전 답변이 있으면 복원
      const previousAnswer = userAnswers[currentQuestionIndex - 1]?.userAnswer;
      if (previousAnswer) {
        if (questionFormat === 'multiple') {
          setSelectedOption(previousAnswer);
        } else {
          setTextAnswer(previousAnswer);
        }
        setIsCorrect(userAnswers[currentQuestionIndex - 1].isCorrect);
        setShowFeedback(true);
      } else {
        setSelectedOption('');
        setTextAnswer('');
      }
    }
  };

  const checkUnansweredQuestions = (): boolean => {
    return userAnswers.some((answer) => {
      if (currentQuestionIndex === questions.length - 1) {
        return answer.userAnswer === '' || !showFeedback;
      }
      answer.userAnswer === '';
    });
  };

  const goToNextQuestion = (): void => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
      setShowFeedback(false);
      setSelectedOption('');
      setTextAnswer('');
      setSlideDirection('right');

      // 다음 답변이 있으면 복원
      const nextAnswer = userAnswers[currentQuestionIndex + 1]?.userAnswer;
      if (nextAnswer) {
        if (questionFormat === 'multiple') {
          setSelectedOption(nextAnswer);
        } else {
          setTextAnswer(nextAnswer);
        }
        setIsCorrect(userAnswers[currentQuestionIndex + 1].isCorrect);
        setShowFeedback(true);
      }
    } else {
      // 결과 화면으로 이동하기 전에 모든 문제가 답변되었는지 확인
      if (checkUnansweredQuestions()) {
        Alert.alert(
          '답변하지 않은 문제가 있어요',
          '확인을 누르면 답변하지 않은 문제는 오답 처리돼요.',
          [
            {
              text: '취소',
              style: 'cancel',
            },
            {
              text: '확인',
              onPress: () => {
                // 답변하지 않은 문제 오답 처리
                const finalAnswers = userAnswers.map((answer) =>
                  answer?.userAnswer === ''
                    ? { ...answer, isCorrect: false }
                    : answer
                );
                setUserAnswers(finalAnswers);
                router.push(`/quiz/${quizType}/result`);
              },
            },
          ]
        );
      } else {
        // 결과 화면으로 이동
        router.push(`/quiz/${quizType}/result`);
      }
    }
  };

  const goToHome = (): void => {
    Alert.alert(
      '퀴즈 종료',
      '퀴즈를 종료하고 홈으로 돌아가시겠어요?\n현재 진행 상황은 저장되지 않아요.',
      [
        {
          text: '취소',
          style: 'cancel',
        },
        {
          text: '확인',
          onPress: () => {
            resetQuizData();
            router.push('/');
          },
        },
      ]
    );
  };

  useBlockNavigation();

  if (!currentQuestion) {
    // 로딩 상태나 질문이 없는 경우
    return (
      <LinearGradient
        colors={['#FF416C', '#FF4B2B']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.container}
      >
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>불러오는 중...</Text>
        </View>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient
      colors={['#8A2387', '#E94057', '#F27121']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.container}
    >
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.scrollContainer}>
          <View style={styles.header}>
            <View style={styles.progressContainer}>
              <View style={styles.progressBarBackground}>
                <Animated.View
                  style={[styles.progressBar, progressAnimatedStyles]}
                />
              </View>
              <Text style={styles.questionCount}>
                {currentQuestionIndex + 1}/{questions.length}
              </Text>
            </View>
            <View style={styles.topButtons}>
              <View style={styles.categoryContainer}>
                <Star width={16} height={16} color='#fff' />
                <Text style={styles.category}>
                  {switchCategoryToLabel(currentQuestion.category)}
                </Text>
              </View>
              <TouchableOpacity style={styles.homeButton} onPress={goToHome}>
                <Home width={20} height={20} color='#fff' />
              </TouchableOpacity>
            </View>
          </View>

          <Animated.View
            key={currentQuestionIndex}
            entering={
              slideDirection === 'right'
                ? SlideInRight.duration(300)
                : SlideInLeft.duration(300)
            }
            exiting={
              slideDirection === 'right'
                ? SlideOutLeft.duration(300)
                : SlideOutRight.duration(300)
            }
            style={styles.questionContainer}
          >
            <Text style={styles.question}>{currentQuestion.question}</Text>

            {questionFormat === 'multiple' ? (
              <View style={styles.optionsContainer}>
                {currentQuestion.options?.map((option) => (
                  <TouchableOpacity
                    key={option}
                    style={[
                      styles.optionButton,
                      selectedOption === option && styles.selectedOption,
                      showFeedback &&
                        selectedOption === option &&
                        isCorrect &&
                        styles.correctOption,
                      showFeedback &&
                        selectedOption === option &&
                        !isCorrect &&
                        styles.wrongOption,
                      showFeedback &&
                        selectedOption !== option &&
                        option === currentQuestion.answer &&
                        styles.correctOption,
                    ]}
                    onPress={() => {
                      if (!showFeedback) {
                        setSelectedOption(option);
                      }
                    }}
                    disabled={showFeedback}
                  >
                    <Text
                      style={[
                        styles.optionText,
                        selectedOption === option && styles.selectedOptionText,
                        showFeedback &&
                          ((selectedOption === option && isCorrect) ||
                            option === currentQuestion.answer) &&
                          styles.correctOptionText,
                        showFeedback &&
                          selectedOption === option &&
                          !isCorrect &&
                          styles.wrongOptionText,
                      ]}
                    >
                      {option}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            ) : (
              <View style={styles.shortAnswerContainer}>
                <TextInput
                  style={[
                    styles.textInput,
                    showFeedback && isCorrect && styles.correctTextInput,
                    showFeedback && !isCorrect && styles.wrongTextInput,
                  ]}
                  placeholder='답변을 입력하세요'
                  placeholderTextColor='rgba(0, 0, 0, 0.5)'
                  value={textAnswer}
                  onChangeText={setTextAnswer}
                  editable={!showFeedback}
                />
              </View>
            )}

            {showFeedback && (
              <Animated.View
                entering={FadeIn.duration(300)}
                style={[
                  styles.feedbackContainer,
                  isCorrect
                    ? styles.correctFeedbackContainer
                    : styles.wrongFeedbackContainer,
                ]}
              >
                <Text
                  style={[
                    styles.feedbackText,
                    isCorrect ? styles.correctFeedback : styles.wrongFeedback,
                  ]}
                >
                  {isCorrect
                    ? '정답이에요! 🔥'
                    : `오답이에요. 정답은 "${currentQuestion.answer}" 입니다`}
                </Text>
              </Animated.View>
            )}

            {!showFeedback && (
              <TouchableOpacity
                style={[
                  styles.submitButton,
                  (questionFormat === 'multiple' && !selectedOption) ||
                  (questionFormat === 'short' && !textAnswer.trim())
                    ? styles.disabledButton
                    : {},
                ]}
                onPress={handleAnswer}
                disabled={
                  questionFormat === 'multiple'
                    ? !selectedOption
                    : !textAnswer.trim()
                }
              >
                <View style={styles.submitButtonContent}>
                  <Text style={styles.submitButtonText}>제출하기</Text>
                  <Check width={20} height={20} color='#fff' />
                </View>
              </TouchableOpacity>
            )}

            <View style={styles.navigationContainer}>
              {currentQuestionIndex > 0 && (
                <TouchableOpacity
                  style={styles.navigationButton}
                  onPress={goToPreviousQuestion}
                >
                  <View style={styles.navigationButtonContent}>
                    <ArrowLeft width={16} height={16} color='#fff' />
                    <Text style={styles.navigationButtonText}>이전</Text>
                  </View>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                style={[styles.navigationButton, styles.nextButton]}
                onPress={goToNextQuestion}
              >
                <View style={styles.navigationButtonContent}>
                  <Text style={styles.navigationButtonText}>
                    {currentQuestionIndex === questions.length - 1
                      ? '결과 보기'
                      : showFeedback
                        ? '다음 문제'
                        : '스킵하기'}
                  </Text>
                  <ArrowRight width={16} height={16} color='#fff' />
                </View>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
    padding: 20,
  },
  header: {
    marginBottom: 20,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  progressBarBackground: {
    height: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 10,
    flex: 1,
    marginRight: 12,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#fff',
    borderRadius: 10,
  },
  questionCount: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  topButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  categoryContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  category: {
    color: '#fff',
    fontSize: 15,
    marginLeft: 6,
    fontWeight: '500',
  },
  homeButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    padding: 10,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  questionContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 24,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 15,
    elevation: 15,
  },
  question: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#222',
    marginBottom: 24,
    lineHeight: 30,
  },
  optionsContainer: {
    marginBottom: 20,
  },
  optionButton: {
    backgroundColor: '#f7f7f7',
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: '#f7f7f7',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  selectedOption: {
    borderColor: '#8A2387',
    shadowColor: '#8A2387',
    shadowOpacity: 0.2,
    elevation: 3,
  },
  correctOption: {
    backgroundColor: 'rgba(46, 213, 115, 0.15)',
    borderColor: '#2ed573',
    shadowColor: '#2ed573',
    shadowOpacity: 0.15,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 3,
    elevation: 0,
  },
  wrongOption: {
    backgroundColor: 'rgba(255, 71, 87, 0.15)',
    borderColor: '#ff4757',
    shadowColor: '#ff4757',
    shadowOpacity: 0.15,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 3,
    elevation: 0,
  },
  optionText: {
    fontSize: 17,
    color: '#333',
  },
  selectedOptionText: {
    fontWeight: '600',
    color: '#8A2387',
  },
  correctOptionText: {
    fontWeight: '600',
    color: '#2ed573',
  },
  wrongOptionText: {
    fontWeight: '600',
    color: '#ff4757',
  },
  shortAnswerContainer: {
    marginBottom: 20,
  },
  textInput: {
    backgroundColor: '#f7f7f7',
    padding: 16,
    borderRadius: 16,
    fontSize: 17,
    borderWidth: 2,
    borderColor: '#f7f7f7',
    color: '#333',
  },
  correctTextInput: {
    borderColor: '#2ed573',
    backgroundColor: 'rgba(46, 213, 115, 0.08)',
  },
  wrongTextInput: {
    borderColor: '#ff4757',
    backgroundColor: 'rgba(255, 71, 87, 0.08)',
  },
  feedbackContainer: {
    padding: 16,
    borderRadius: 16,
    marginBottom: 20,
    borderWidth: 1,
  },
  correctFeedbackContainer: {
    backgroundColor: 'rgba(46, 213, 115, 0.1)',
    borderColor: '#2ed573',
  },
  wrongFeedbackContainer: {
    backgroundColor: 'rgba(255, 71, 87, 0.1)',
    borderColor: '#ff4757',
  },
  feedbackText: {
    fontSize: 17,
    textAlign: 'center',
    fontWeight: '600',
  },
  correctFeedback: {
    color: '#2ed573',
  },
  wrongFeedback: {
    color: '#ff4757',
  },
  submitButton: {
    backgroundColor: '#8A2387',
    paddingVertical: 16,
    borderRadius: 50,
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#8A2387',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  disabledButton: {
    backgroundColor: '#bbb',
    shadowOpacity: 0.1,
  },
  submitButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginRight: 8,
  },
  navigationContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  navigationButton: {
    flex: 1,
    padding: 14,
    borderRadius: 50,
    alignItems: 'center',
    backgroundColor: '#E94057',
    marginHorizontal: 5,
  },
  nextButton: {
    backgroundColor: '#F27121',
    shadowColor: '#F27121',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 5,
    elevation: 4,
  },
  navigationButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  navigationButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginHorizontal: 4,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 18,
    color: '#fff',
    fontWeight: '600',
  },
});
