import { MovieService } from './../movie/movie.service'
import { Injectable, NotFoundException } from '@nestjs/common'
import { InjectModel } from 'nestjs-typegoose'
import { GenreModel } from './genre.model'
import { DocumentType, ModelType } from '@typegoose/typegoose/lib/types'
import { CreateGenreDto } from './dto/create-genre.dto'
import { ICollection } from './interface/genre.interface'
import { Types } from 'mongoose'

@Injectable()
export class GenreService {
	constructor(
		@InjectModel(GenreModel) private readonly genreModel: ModelType<GenreModel>,
		private readonly movieService: MovieService
	) {}

	async bySlug(slug: string): Promise<DocumentType<GenreModel>> {
		return this.genreModel.findOne({ slug }).exec()
	}

	async getPopular(): Promise<DocumentType<GenreModel>[]> {
		return this.genreModel
			.find()
			.select('-updatedAt -__v')
			.sort({ createdAt: 'desc' })
			.exec()
	}

	async getAll(searchTerm?: string): Promise<DocumentType<GenreModel>[]> {
		let options = {}

		if (searchTerm) {
			options = {
				$or: [
					{
						name: new RegExp(searchTerm, 'i'),
					},
					{
						slug: new RegExp(searchTerm, 'i'),
					},
					{
						description: new RegExp(searchTerm, 'i'),
					},
				],
			}
		}

		return this.genreModel
			.find(options)
			.select(' -updatedAt -__v')
			.sort({ createdAt: 'desc' })
			.exec()
	}

	async getCollections(): Promise<ICollection[]> {
		const genres = await this.getAll()
		const collections = await Promise.all(
			genres.map(async (genre) => {
				const moviesByGenre = await this.movieService.byGenres([genre._id])

				const result: ICollection = {
					_id: String(genre._id),
					image: moviesByGenre[0]?.bigPoster,
					title: genre.name,
					slug: genre.slug,
				}
				return result
			})
		)

		return collections
	}

	// !Admin place

	async byId(_id: string): Promise<DocumentType<GenreModel>> {
		const genre = await this.genreModel.findById(_id)
		if (!genre) throw new NotFoundException('Genre not found!')

		return genre
	}

	async create(): Promise<Types.ObjectId> {
		const defaultValue: CreateGenreDto = {
			name: '',
			slug: '',
			description: '',
			icon: '',
		}
		const genre = await this.genreModel.create(defaultValue)
		return genre._id
	}

	async update(
		_id: string,
		dto: CreateGenreDto
	): Promise<DocumentType<GenreModel> | null> {
		const updateGenre = await this.genreModel
			.findByIdAndUpdate(_id, dto, {
				new: true,
			})
			.exec()
		if (!updateGenre) throw new NotFoundException('Genre not found!')
		return updateGenre
	}

	async delete(id: string): Promise<DocumentType<GenreModel> | null> {
		const deleteGenre = await this.genreModel.findByIdAndDelete(id).exec()

		if (!deleteGenre) throw new NotFoundException('Genre not found!')
		return deleteGenre
	}
}
