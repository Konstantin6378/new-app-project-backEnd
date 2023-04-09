import { TelegramService } from './../telegram/telegram.service'
import { MovieModel } from './movie.model'
import { Injectable, NotFoundException } from '@nestjs/common'
import { DocumentType, ModelType } from '@typegoose/typegoose/lib/types'
import { InjectModel } from 'nestjs-typegoose'
import { UpdateMovieDto } from './dto/update-movie.dto'
import { Types } from 'mongoose'

@Injectable()
export class MovieService {
	constructor(
		@InjectModel(MovieModel) private readonly MovieModel: ModelType<MovieModel>,
		private readonly telegramService: TelegramService
	) {}

	async getAll(searchTerm?: string): Promise<DocumentType<MovieModel>[]> {
		let options = {}

		if (searchTerm) {
			options = {
				$or: [
					{
						title: new RegExp(searchTerm, 'i'),
					},
				],
			}
		}

		return this.MovieModel.find(options)
			.select(' -updatedAt -__v')
			.sort({ createdAt: 'desc' })
			.populate('actors genres')
			.exec()
	}

	async bySlug(slug: string): Promise<DocumentType<MovieModel>> {
		const doc = await this.MovieModel.findOne({ slug })
			.populate('actors genres')
			.exec()
		if (!doc) throw new NotFoundException('Movie not found!')
		return doc
	}

	async byActor(actorId: Types.ObjectId): Promise<DocumentType<MovieModel>[]> {
		const docs = await this.MovieModel.find({ actors: actorId }).exec()
		if (!docs) throw new NotFoundException('Movies not found!')
		return docs
	}

	async byGenres(
		genreIds: Types.ObjectId[]
	): Promise<DocumentType<MovieModel>[]> {
		const docs = await this.MovieModel.find({
			genres: { $in: genreIds },
		}).exec()
		if (!docs) throw new NotFoundException('Movies not found!')
		return docs
	}

	async updateCountOpened(slug: string) {
		const updateDoc = await this.MovieModel.findOneAndUpdate(
			{ slug },
			{
				$inc: { countOpened: 1 },
			},
			{
				new: true,
			}
		).exec()
		if (!updateDoc) throw new NotFoundException('Movie not found!')
		return updateDoc
	}

	// !Admin place

	async byId(_id: string): Promise<DocumentType<MovieModel>> {
		const doc = await this.MovieModel.findById(_id)
		if (!doc) throw new NotFoundException('Movie not found!')

		return doc
	}

	async create(): Promise<Types.ObjectId> {
		const defaultValue: UpdateMovieDto = {
			bigPoster: '',
			actors: [],
			genres: [],
			description: '',
			poster: '',
			title: '',
			videoUrl: '',
			slug: '',
		}
		const movie = await this.MovieModel.create(defaultValue)
		return movie._id
	}

	async update(
		_id: string,
		dto: UpdateMovieDto
	): Promise<DocumentType<MovieModel> | null> {
		if (!dto.isSendTelegram) {
			await this.sendNotifications(dto)
			dto.isSendTelegram = true
		}

		const updateDoc = await this.MovieModel.findByIdAndUpdate(_id, dto, {
			new: true,
		}).exec()
		if (!updateDoc) throw new NotFoundException('Actor not found!')
		return updateDoc
	}

	async delete(id: string): Promise<DocumentType<MovieModel> | null> {
		const deleteMovie = await this.MovieModel.findByIdAndDelete(id).exec()

		if (!deleteMovie) throw new NotFoundException('Movie not found!')
		return deleteMovie
	}

	async getMostPopular(): Promise<DocumentType<MovieModel>[]> {
		return this.MovieModel.find({ countOpened: { $gt: 0 } })
			.sort({ countOpened: -1 })
			.populate('genres')
			.exec()
	}

	async updateRating(id: Types.ObjectId, newRating: number) {
		return this.MovieModel.findByIdAndUpdate(
			id,
			{
				rating: newRating,
			},
			{
				new: true,
			}
		).exec()
	}

	async sendNotifications(dto: UpdateMovieDto) {
		if (process.env.NODE_ENV !== 'development')
			await this.telegramService.sendPhoto(dto.poster)

		const msg = `<b>${dto.title}</b>\n\n` + `${dto.description}\n\n`

		await this.telegramService.sendMessage(msg, {
			reply_markup: {
				inline_keyboard: [
					[
						{
							url: 'https://okko.tv/movie/free-guy',
							text: '🍿🍿🍿 Go to watch',
						},
					],
				],
			},
		})
	}
}
