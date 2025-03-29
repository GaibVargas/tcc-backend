import { describe, test, expect, beforeEach } from '@jest/globals'
import { QuizManager } from './quiz-manager'
import { QuestionType, Quiz } from './type'

describe('QuizManager', () => {
  let quiz: Quiz
  let quizManager: QuizManager

  beforeEach(() => {
    quiz = {
      public_id: 'quiz1',
      title: 'Sample Quiz',
      questions: [
        {
          public_id: 'q1',
          description: 'What is 2+2?',
          type: QuestionType.TEXT,
          time_limit: 30,
          options: [],
          correct_text_answer: '4',
        },
        {
          public_id: 'q2',
          description: 'What is the capital of France?',
          type: QuestionType.TEXT,
          time_limit: 30,
          options: [],
          correct_text_answer: 'Paris',
        },
        {
          public_id: 'q3',
          description: 'What is Brazil?',
          type: QuestionType.MULTI_CHOICE,
          time_limit: 30,
          options: [
            {
              public_id: 'q3-o1',
              description: 'Country',
              is_correct_answer: true,
            },
            {
              public_id: 'q3-o2',
              description: 'Dish',
              is_correct_answer: false,
            },
            {
              public_id: 'q3-o3',
              description: 'Nationality',
              is_correct_answer: false,
            },
            {
              public_id: 'q3-o4',
              description: 'Animal',
              is_correct_answer: false,
            },
          ],
          correct_text_answer: '',
        },
        {
          public_id: 'q4',
          description: 'Brazis is a Country of the South America',
          type: QuestionType.TRUE_OR_FALSE,
          time_limit: 30,
          options: [
            {
              public_id: 'q4-o1',
              description: 'True',
              is_correct_answer: true,
            },
            {
              public_id: 'q4-o2',
              description: 'False',
              is_correct_answer: false,
            },
          ],
          correct_text_answer: '',
        },
      ],
    }
    quizManager = new QuizManager(quiz)
  })

  test('should start current question and store timestamp', () => {
    const question = quizManager.startCurrentQuestion()
    expect(question.startedAt).toBeGreaterThan(0)
  })

  test('should move to next question', () => {
    quizManager.getNextQuestion()
    expect(quizManager.getCurrentQuestion()).toMatchObject({
      public_id: 'q2',
      description: 'What is the capital of France?',
    })
  })

  test('should correctly evaluate a correct answer', () => {
    const feedback = quizManager.answerQuestion('user1', 'q1', '4', 10)
    expect(feedback).toBeDefined()
    expect(feedback?.feedback.is_correct).toBe(true)
  })

  test('should correctly evaluate an incorrect answer', () => {
    const feedback = quizManager.answerQuestion('user1', 'q1', '5', 10)
    expect(feedback).toBeDefined()
    expect(feedback?.feedback.is_correct).toBe(false)
  })

  test('should return participants that answered a question', () => {
    quizManager.answerQuestion('user1', 'q1', '4', 10)
    quizManager.answerQuestion('user2', 'q1', '4', 10)
    expect(quizManager.getParticipantsThatAnsweredQuestion('q1')).toEqual([
      'user1',
      'user2',
    ])
  })

  test('should provide participant feedback', () => {
    quizManager.answerQuestion('user1', 'q1', '4', 10)
    expect(
      quizManager.getParticipantQuestionFeedback('user1', 'q1'),
    ).toMatchObject({
      correct_answer: '4',
      given_answer: '4',
      is_correct: true,
    })
  })

  test('should provide instructor feedback', () => {
    quizManager.answerQuestion('user1', 'q1', '4', 10)
    quizManager.answerQuestion('user2', 'q1', '5', 10)
    expect(quizManager.getInstructorQuestionFeedback('q1')).toMatchObject({
      correct_answer: '4',
      answers: { '4': ['user1'], '5': ['user2'] },
    })
  })

  test('should correctly calculate velocity bonuses', () => {
    const n_users = 2
    const feedback1 = quizManager.answerQuestion('user1', 'q1', '4', n_users)
    expect(feedback1?.feedback.velocity_bonus).toBe(n_users - 1)
    
    const feedback2 = quizManager.answerQuestion('user2', 'q1', '4', n_users)
    expect(feedback2?.feedback.velocity_bonus).toBe(n_users - 2)
  })

  test('should correctly calculate user score bonuses', () => {
    const n_users = 10
    const feedback1 = quizManager.answerQuestion('user1', 'q1', '4', n_users)
    expect(feedback1?.feedback.points).toBe(100)
    expect(feedback1?.feedback.streak_bonus).toBe(0)
    expect(feedback1?.feedback.velocity_bonus).toBe(n_users - 1)
    
    quizManager.getNextQuestion()
    const feedback2 = quizManager.answerQuestion('user1', 'q2', 'Paris', n_users)
    expect(feedback2?.feedback.points).toBe(100)
    expect(feedback2?.feedback.streak_bonus).toBe(10)
    expect(feedback2?.feedback.velocity_bonus).toBe(n_users - 1)
    
    quizManager.getNextQuestion()
    const feedback3 = quizManager.answerQuestion('user1', 'q3', 'q3-o1', n_users)
    expect(feedback3?.feedback.points).toBe(100)
    expect(feedback3?.feedback.streak_bonus).toBe(20)
    expect(feedback3?.feedback.velocity_bonus).toBe(n_users - 1)

    quizManager.getNextQuestion()
    const feedback4 = quizManager.answerQuestion('user1', 'q4', 'q4-o1', n_users)
    expect(feedback4?.feedback.points).toBe(100)
    expect(feedback4?.feedback.streak_bonus).toBe(20)
    expect(feedback4?.feedback.velocity_bonus).toBe(n_users - 1)
  })

  test('should correctly calculate user score with wrong answer', () => {
    const n_users = 10
    const feedback1 = quizManager.answerQuestion('user1', 'q1', '4', n_users)
    expect(feedback1?.feedback.points).toBe(100)
    expect(feedback1?.feedback.streak_bonus).toBe(0)
    expect(feedback1?.feedback.velocity_bonus).toBe(n_users - 1)
    
    quizManager.getNextQuestion()
    const feedback2 = quizManager.answerQuestion('user1', 'q2', 'Wrong answers', n_users)
    expect(feedback2?.feedback.points).toBe(0)
    expect(feedback2?.feedback.streak_bonus).toBe(0)
    expect(feedback2?.feedback.velocity_bonus).toBe(0)
    
    quizManager.getNextQuestion()
    const feedback3 = quizManager.answerQuestion('user1', 'q3', 'q3-o1', n_users)
    expect(feedback3?.feedback.points).toBe(100)
    expect(feedback3?.feedback.streak_bonus).toBe(0)
    expect(feedback3?.feedback.velocity_bonus).toBe(n_users - 1)

    quizManager.getNextQuestion()
    const feedback4 = quizManager.answerQuestion('user1', 'q4', 'q4-o1', n_users)
    expect(feedback4?.feedback.points).toBe(100)
    expect(feedback4?.feedback.streak_bonus).toBe(10)
    expect(feedback4?.feedback.velocity_bonus).toBe(n_users - 1)
  })
})
