import { describe, test, expect, beforeEach } from '@jest/globals'
import { Ranking, RankingItem } from './ranking'

describe('Ranking class', () => {
  let ranking: Ranking

  beforeEach(() => {
    ranking = new Ranking()
  })

  test('should update the score of a player', () => {
    const player: RankingItem = { id: 'player1', score: 10 }
    ranking.updateScore(player)
    expect(ranking.getRanking()).toEqual([
      { rank: '1', entries: [{ id: 'player1', score: 10 }] },
    ])
  })

  test('should correctly rank players with different scores', () => {
    ranking.updateScore({ id: 'player1', score: 10 })
    ranking.updateScore({ id: 'player2', score: 20 })
    ranking.updateScore({ id: 'player3', score: 15 })

    expect(ranking.getRanking()).toEqual([
      { rank: '1', entries: [{ id: 'player2', score: 20 }] },
      { rank: '2', entries: [{ id: 'player3', score: 15 }] },
      { rank: '3', entries: [{ id: 'player1', score: 10 }] },
    ])
  })

  test('should correctly handle players with the same score (ties)', () => {
    ranking.updateScore({ id: 'player1', score: 10 })
    ranking.updateScore({ id: 'player2', score: 20 })
    ranking.updateScore({ id: 'player3', score: 20 })

    expect(ranking.getRanking()).toEqual([
      {
        rank: '1',
        entries: [
          { id: 'player2', score: 20 },
          { id: 'player3', score: 20 },
        ],
      },
      { rank: '2', entries: [{ id: 'player1', score: 10 }] },
    ])
  })

  test('should return an empty ranking when no players exist', () => {
    expect(ranking.getRanking()).toEqual([])
  })

  test('should correctly limit the ranking to top N players', () => {
    ranking.updateScore({ id: 'player1', score: 10 })
    ranking.updateScore({ id: 'player2', score: 20 })
    ranking.updateScore({ id: 'player3', score: 15 })
    ranking.updateScore({ id: 'player4', score: 25 })

    expect(ranking.getRanking(2)).toEqual([
      { rank: '1', entries: [{ id: 'player4', score: 25 }] },
      { rank: '2', entries: [{ id: 'player2', score: 20 }] },
    ])
  })
})
