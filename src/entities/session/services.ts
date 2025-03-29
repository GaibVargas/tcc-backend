import { Paginated, PaginationQuery } from '../../common/pagination'
import HttpRequestError from '../../utils/error'
import { MinUser, SessionPlayer } from '../user/type'
import sessionModel from './model'
import { SessionGradesStatus, SessionItem, SessionReport } from './type'

export async function getFinishedSessionsByAuthor(
  user: MinUser,
  query: PaginationQuery,
): Promise<Paginated<SessionItem[]>> {
  return await sessionModel.findFinishedSessionsByAuthorId(user.id, query)
}

export async function getOngoingSessionsByAuthor(
  user: MinUser,
): Promise<SessionItem[]> {
  return await sessionModel.findOngoingSessionsByAuthorId(user.id)
}

export async function getPlayersResult(
  user_id: number,
  code: string,
): Promise<SessionPlayer[]> {
  const session = await sessionModel.findSessionIdByCode(code)
  if (!session)
    throw new HttpRequestError({
      message: 'Session not found',
      status_code: 400,
    })
  if (session.author_id !== user_id)
    throw new HttpRequestError({
      message: 'Unauthorized',
      status_code: 401,
    })
  return await sessionModel.findPlayersResultBySessionId(session.id)
}

export async function setSessionGradeStatus(
  user_id: number,
  code: string,
  status: SessionGradesStatus,
): Promise<void> {
  const session = await sessionModel.findSessionIdByCode(code)
  if (!session)
    throw new HttpRequestError({
      message: 'Session not found',
      status_code: 400,
    })
  if (session.author_id !== user_id)
    throw new HttpRequestError({
      message: 'Unauthorized',
      status_code: 401,
    })
  await sessionModel.updateSessionGradeStatusById(session.id, status)
}

export async function sessionReportView(
  user_id: number,
  id: string,
): Promise<SessionReport> {
  const session_report = await sessionModel.findSessionReportByPubliId(id)
  if (!session_report)
    throw new HttpRequestError({
      message: 'Session not found',
      status_code: 400,
    })
  if (session_report.quiz.author_id !== user_id)
    throw new HttpRequestError({
      message: 'Unauthorized',
      status_code: 401,
    })
  return session_report
}

const sessionServices = {
  getFinishedSessionsByAuthor,
  getOngoingSessionsByAuthor,
  getPlayersResult,
  setSessionGradeStatus,
  sessionReportView,
}

export default sessionServices
